from rest_framework import serializers
from .models import Conversation, Message
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name']
        read_only_fields = fields

class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages"""
    sender = UserSerializer(read_only=True)
    conversation = serializers.PrimaryKeyRelatedField(queryset=Conversation.objects.all(), write_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'timestamp', 'is_read', 'conversation']
        read_only_fields = ['sender', 'timestamp', 'is_read']
    
    def create(self, validated_data):
        # The conversation is already included in validated_data from the PrimaryKeyRelatedField
        return super().create(validated_data)

class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for conversations"""
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'created_at', 'updated_at', 'is_group', 'name', 'last_message', 'unread_count']
        read_only_fields = fields
    
    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

import logging
import uuid
from django.db import transaction

logger = logging.getLogger(__name__)


class CreateConversationSerializer(serializers.ModelSerializer):
    """Serializer for creating a new conversation"""
    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=True
    )
    
    def validate_participant_ids(self, value):
        """
        Validate that all participant IDs exist and belong to the same organization as the current user.
        Returns list of user IDs.
        """
        try:
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError("Authentication required")
                
            current_user = request.user
            logger.info(f"Validating participant IDs for user {current_user.id}: {value}")
            
            # Convert and validate UUIDs
            from uuid import UUID
            user_ids = []
            
            for user_id in value:
                try:
                    # Convert to string and validate UUID format
                    user_uuid = str(UUID(str(user_id)))
                    user_ids.append(user_uuid)
                except (ValueError, TypeError, AttributeError) as e:
                    logger.error(f"Invalid user ID format: {user_id}")
                    raise serializers.ValidationError(f"Invalid user ID format: {user_id}")
            
            # Convert string UUIDs to UUID objects if needed
            try:
                user_uuids = [
                    uuid.UUID(str(user_id)) if isinstance(user_id, str) else user_id 
                    for user_id in user_ids
                ]
            except (ValueError, AttributeError, TypeError) as e:
                logger.error(f"Invalid user ID format: {e}")
                raise serializers.ValidationError("Invalid user ID format")
            
            # Verify all users exist
            existing_users = set(
                User.objects.filter(id__in=user_uuids)
                .values_list('id', flat=True)
            )
            
            # Find users who don't exist
            invalid_users = [
                str(user_id) for user_id in user_uuids 
                if user_id not in existing_users
            ]
            
            if invalid_users:
                logger.error(f"Users not found: {invalid_users}")
                raise serializers.ValidationError(
                    f"Users not found: {', '.join(str(u) for u in sorted(invalid_users))}"
                )
            
            logger.info(f"Validated {len(user_uuids)} users for conversation")
            return user_uuids
                
        except Exception as e:
            logger.error(f"Error validating participant IDs: {str(e)}", exc_info=True)
            raise serializers.ValidationError(f"Error validating users: {str(e)}")
    
    class Meta:
        model = Conversation
        fields = ['id', 'participant_ids', 'name', 'is_group']
        extra_kwargs = {
            'name': {'required': False},
            'is_group': {'required': False}
        }
    
    def create(self, validated_data):
        logger.info(f"Creating conversation with validated data: {validated_data}")
        
        try:
            participant_ids = validated_data.pop('participant_ids', [])
            is_group = validated_data.get('is_group', len(participant_ids) > 1)
            request = self.context.get('request')
            current_user = request.user if request and hasattr(request, 'user') else None
            
            if not current_user:
                raise serializers.ValidationError("Authentication required")
                
            logger.info(f"Processing conversation creation with participant IDs: {participant_ids}, is_group: {is_group}")
            
            # If it's a group conversation, generate a name if not provided
            if is_group and not validated_data.get('name'):
                participant_users = User.objects.filter(id__in=participant_ids)
                participant_names = list(participant_users.values_list('first_name', flat=True)[:3])
                name = ", ".join(participant_names)
                if len(participant_ids) > 3:
                    name += f" and {len(participant_ids) - 3} others"
                validated_data['name'] = name
                logger.info(f"Generated group name: {validated_data['name']}")
            
            # Create the conversation in a transaction
            with transaction.atomic():
                try:
                    # Create the conversation
                    conversation = Conversation.objects.create(
                        name=validated_data.get('name'),
                        is_group=is_group
                    )
                    
                    # Add participants (including current user)
                    all_participant_ids = list(set(participant_ids + [current_user.id]))
                    participants = User.objects.filter(id__in=all_participant_ids)
                    conversation.participants.add(*participants)
                    
                    # Set current user as admin for group conversations
                    if is_group:
                        from .models import ConversationParticipant
                        ConversationParticipant.objects.filter(
                            conversation=conversation,
                            user=current_user
                        ).update(is_admin=True)
                    
                    logger.info(f"Successfully created conversation {conversation.id} with {participants.count()} participants")
                    return conversation
                    
                except Exception as e:
                    logger.error(f"Error in conversation creation transaction: {str(e)}", exc_info=True)
                    raise serializers.ValidationError(f"Failed to create conversation: {str(e)}")
                    
        except serializers.ValidationError:
            raise  # Re-raise validation errors
            
        except Exception as e:
            logger.error(f"Unexpected error in conversation creation: {str(e)}", exc_info=True)
            raise serializers.ValidationError("An unexpected error occurred while creating the conversation")