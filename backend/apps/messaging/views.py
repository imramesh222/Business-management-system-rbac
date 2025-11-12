from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Case, When, Value, BooleanField
from django.db.models.functions import Coalesce

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

class ConversationViewSet(viewsets.GenericViewSet, 
                         mixins.ListModelMixin,
                         mixins.RetrieveModelMixin,
                         mixins.CreateModelMixin):
    """
    ViewSet for managing conversations
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
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
    
    def perform_create(self, serializer):
        """Create a new conversation"""
        serializer.save()
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """List messages in a conversation"""
        conversation = self.get_object()
        
        # Mark unread messages as read
        Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(
            sender=request.user
        ).update(is_read=True)
        
        # Get paginated messages
        messages = conversation.messages.all().order_by('timestamp')
        page = self.paginate_queryset(messages)
        
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark all messages in a conversation as read"""
        conversation = self.get_object()
        updated = conversation.messages.filter(
            is_read=False
        ).exclude(
            sender=request.user
        ).update(is_read=True)
        
        return Response({
            'status': 'success',
            'updated_count': updated
        })
    
    @action(detail=False, methods=['get'])
    def search_users(self, request):
        """Search for users to start a conversation"""
        query = request.query_params.get('q', '').strip()
        
        if not query:
            return Response([])
            
        users = User.objects.filter(
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=request.user.id)[:10]
        
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


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
        message = serializer.save(sender=self.request.user)
        # Update conversation's updated_at
        message.conversation.save(update_fields=['updated_at'])
    
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        if message.sender != request.user:
            message.mark_as_read()
        return Response({'status': 'success'})
