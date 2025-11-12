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
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'timestamp', 'is_read']
        read_only_fields = ['sender', 'timestamp', 'is_read']

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

class CreateConversationSerializer(serializers.ModelSerializer):
    """Serializer for creating a new conversation"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True
    )
    
    class Meta:
        model = Conversation
        fields = ['id', 'participant_ids', 'name', 'is_group']
        extra_kwargs = {
            'name': {'required': False},
            'is_group': {'required': False}
        }
    
    def create(self, validated_data):
        participant_ids = validated_data.pop('participant_ids', [])
        is_group = validated_data.pop('is_group', len(participant_ids) > 1)
        
        # If it's a group conversation, name is required
        if is_group and not validated_data.get('name'):
            validated_data['name'] = f"Group {Conversation.objects.count() + 1}"
        
        conversation = Conversation.objects.create(
            is_group=is_group,
            **validated_data
        )
        
        # Add participants
        participants = User.objects.filter(id__in=participant_ids)
        conversation.participants.add(*participants)
        
        # Add the current user if not in participants
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user not in participants:
            conversation.participants.add(request.user)
        
        return conversation
