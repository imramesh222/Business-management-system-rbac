import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import Message, Conversation
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for handling chat messages"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.room_name = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.room_name}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']
            sender_id = text_data_json.get('sender_id')
            
            if not sender_id:
                await self.send(text_data=json.stringify({
                    'error': 'sender_id is required'
                }))
                return
                
            # Save message to database
            message_obj = await self.save_message(sender_id, message)
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': sender_id,
                    'timestamp': message_obj.timestamp.isoformat(),
                    'message_id': message_obj.id
                }
            )
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'error': str(e)
            }))

    async def chat_message(self, event):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'timestamp': event['timestamp'],
            'message_id': event['message_id']
        }))
    
    @database_sync_to_async
    def save_message(self, sender_id, content):
        """Save message to database"""
        try:
            sender = User.objects.get(id=sender_id)
            conversation = Conversation.objects.get(id=self.room_name)
            
            # Verify user is a participant
            if not conversation.participants.filter(id=sender_id).exists():
                raise ValueError("You are not a participant in this conversation")
                
            message = Message.objects.create(
                conversation=conversation,
                sender=sender,
                content=content
            )
            
            # Update conversation's updated_at
            conversation.save(update_fields=['updated_at'])
            
            return message
        except User.DoesNotExist:
            raise ValueError("Invalid sender ID")
        except Conversation.DoesNotExist:
            raise ValueError("Invalid conversation ID")
