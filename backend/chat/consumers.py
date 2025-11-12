import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    async def connect(self):
        # Get token from query string
        query_params = parse_qs(self.scope.get('query_string', b'').decode('utf-8'))
        token = query_params.get('token', [None])[0]
        
        if not token:
            logger.error("No token provided in WebSocket connection")
            await self.close(code=4003)  # Forbidden
            return
            
        try:
            # Manually validate the token
            access_token = AccessToken(token)
            self.user_id = str(access_token['user_id'])
            logger.info(f"WebSocket connection attempt for user_id: {self.user_id}")
            
            # Set the user in the scope for authentication middleware
            self.scope['user'] = await self.get_user(self.user_id)
            if not self.scope['user']:
                raise Exception("User not found")
                
        except (InvalidToken, TokenError) as e:
            logger.error(f"Invalid token: {str(e)}")
            await self.close(code=4003)  # Forbidden
            return
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            await self.close(code=4003)  # Forbidden
            return

        # Join room group
        self.room_group_name = f'user_{self.user_id}'
        
        try:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.accept()
            logger.info(f"WebSocket connected: {self.room_group_name}")
            
            # Send a welcome message
            await self.send(text_data=json.dumps({
                'type': 'connection.established',
                'message': 'WebSocket connection established',
                'user_id': str(self.user_id)
            }))
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {str(e)}")
            await self.close(code=1011)  # Internal Error

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"WebSocket disconnected: {self.room_group_name}")

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json.get('message')
            recipient_id = text_data_json.get('recipient_id')
            
            if not message or not recipient_id:
                return

            # Send message to recipient's room
            await self.channel_layer.group_send(
                f'user_{recipient_id}',
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': str(self.user.id)
                }
            )
            
        except json.JSONDecodeError:
            print("Invalid JSON received")
        except Exception as e:
            print(f"Error processing message: {str(e)}")

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'message': event['message'],
            'sender_id': event['sender_id']
        }))
