from rest_framework import serializers, viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db import transaction
from django.db.models import Q, Count, Case, When, Value, BooleanField
from django.db.models.functions import Coalesce
import logging

from .models import Conversation, Message
from .serializers import (
    ConversationSerializer, 
    MessageSerializer, 
    CreateConversationSerializer,
    UserSerializer
)
from django.contrib.auth import get_user_model

User = get_user_model()

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

# In backend/apps/messaging/views.py

class ConversationViewSet(viewsets.GenericViewSet, 
                         mixins.ListModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.CreateModelMixin):
    """
    ViewSet for managing conversations
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    http_method_names = ['get', 'post', 'head', 'options', 'patch']
    
    
    def get_queryset(self):
        """
        Return conversations for the current user with additional annotations
        """
        user = self.request.user
        
        # Annotate with unread count and last message
        return (
            Conversation.objects
            .filter(participants=user)
            .annotate(
                unread_count=Count(
                    'messages',
                    filter=~Q(messages__sender=user) & Q(messages__is_read=False)
                ),
                has_unread=Case(
                    When(unread_count__gt=0, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField()
                )
            )
            .prefetch_related('participants', 'messages')
            .order_by('-updated_at')
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateConversationSerializer
        return ConversationSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new conversation"""
        logger = logging.getLogger(__name__)
        logger.info(f"Creating new conversation with data: {request.data}")
        
        try:
            # Log the incoming request data
            logger.debug(f"Request user: {request.user}")
            logger.debug(f"Request data: {request.data}")
            
            # Initialize serializer with request context
            serializer = self.get_serializer(data=request.data, context={'request': request})
            
            # Validate the data
            try:
                serializer.is_valid(raise_exception=True)
            except serializers.ValidationError as ve:
                logger.warning(f"Validation error: {str(ve)}")
                raise
                
            # Start transaction
            with transaction.atomic():
                try:
                    # Save the conversation
                    conversation = serializer.save()
                    logger.info(f"Successfully created conversation {conversation.id}")
                    
                    # Get the full conversation data with participants
                    response_serializer = ConversationSerializer(
                        conversation, 
                        context={'request': request}
                    )
                    
                    # Prepare response
                    headers = self.get_success_headers(serializer.data)
                    return Response(
                        response_serializer.data,
                        status=status.HTTP_201_CREATED,
                        headers=headers
                    )
                    
                except Exception as e:
                    logger.error(f"Error in transaction: {str(e)}", exc_info=True)
                    raise
                    
        except serializers.ValidationError as ve:
            # Re-raise validation errors with details
            logger.warning(f"Validation error: {str(ve)}")
            return Response(
                {"detail": str(ve)},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            # Log the full error with traceback
            logger.error(
                f"Unexpected error in conversation creation: {str(e)}", 
                exc_info=True
            )
            # Return a more detailed error message in development
            error_detail = str(e)
            return Response(
                {
                    "detail": "An error occurred while creating the conversation",
                    "error": error_detail
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='mark_as_read', url_name='mark_as_read')
    def mark_as_read(self, request, pk=None):
        """Mark all messages in a conversation as read for the current user"""
        logger = logging.getLogger(__name__)
        logger.info(f"[DEBUG] mark_as_read called with pk={pk}, method={request.method}")
        logger.info(f"[DEBUG] Request data: {request.data}")
        logger.info(f"[DEBUG] Request path: {request.path}")
        
        try:
            # Get the conversation
            logger.info(f"[DEBUG] Getting conversation with pk={pk}")
            conversation = self.get_object()
            logger.info(f"[DEBUG] Found conversation: {conversation.id}")
            
            # Mark all unread messages in this conversation as read
            logger.info("[DEBUG] Updating unread messages...")
            updated = Message.objects.filter(
                conversation=conversation,
                is_read=False
            ).exclude(
                sender=request.user
            ).update(is_read=True)
            
            logger.info(f"[DEBUG] Marked {updated} messages as read in conversation {pk}")
            
            # Return the updated conversation
            serializer = self.get_serializer(conversation)
            logger.info("[DEBUG] Returning success response")
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(
                f"[ERROR] Error marking messages as read: {str(e)}",
                exc_info=True
            )
            return Response(
                {"detail": f"Error marking messages as read: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )

class MessageViewSet(viewsets.GenericViewSet,
                    mixins.CreateModelMixin,
                    mixins.DestroyModelMixin):
    """
    ViewSet for managing messages
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        return Message.objects.filter(
            conversation__participants=self.request.user
        ).select_related('sender', 'conversation')
    
    def perform_create(self, serializer):
        """Save the message and update conversation timestamp"""
        # The conversation is already validated by the serializer
        message = serializer.save(sender=self.request.user)
        # Update conversation's updated_at
        message.conversation.save(update_fields=['updated_at'])
        
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        if message.sender != request.user:
            message.mark_as_read()
        return Response({'status': 'success'})
