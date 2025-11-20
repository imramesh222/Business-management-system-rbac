import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from .models import Message, Conversation

logger = logging.getLogger(__name__)
User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for handling chat messages"""
    
    async def connect(self):
        """Handle WebSocket connection"""
        try:
            # Get conversation ID from URL route
            self.room_name = self.scope['url_route']['kwargs'].get('conversation_id')
            if not self.room_name:
                logger.error("[WebSocket] No conversation_id provided")
                await self.close(code=4000)  # Bad request
                return
                
            self.room_group_name = f'chat_{self.room_name}'
            
            logger.info(f"[WebSocket] New connection attempt for conversation: {self.room_name}")
            
            # Check if user is authenticated via session
            self.user = self.scope.get("user", AnonymousUser())
            logger.info(f"[WebSocket] Initial user from scope: {getattr(self.user, 'id', 'anonymous')} (authenticated: {getattr(self.user, 'is_authenticated', False)})")
            
            # If user is not authenticated, try token authentication
            if not getattr(self.user, 'is_authenticated', False):
                logger.info("[WebSocket] User is not authenticated, attempting token authentication")
                query_string = self.scope.get('query_string', b'').decode('utf-8')
                logger.info(f"[WebSocket] Query string: {query_string}")
                
                # Parse query parameters
                from urllib.parse import parse_qs
                params = parse_qs(query_string)
                token = params.get('token', [None])[0]
                
                if token:
                    logger.info(f"[WebSocket] Extracted token: {token[:10]}...")
                    
                    try:
                        access_token = AccessToken(token)
                        logger.info(f"[WebSocket] Decoded token payload: {access_token.payload}")
                        
                        self.user = await self.get_user(access_token['user_id'])
                        if not self.user:
                            logger.error(f"[WebSocket] No user found with ID: {access_token['user_id']}")
                            await self.close(code=4003)  # Forbidden
                            return
                            
                        logger.info(f"[WebSocket] Authenticated as user: {self.user.id} ({getattr(self.user, 'email', 'no-email')})")
                        
                    except Exception as e:
                        logger.error(f"[WebSocket] Token validation error: {str(e)}", exc_info=True)
                        await self.close(code=4001)  # Unauthorized
                        return
                else:
                    logger.error("[WebSocket] No token provided in query parameters")
                    await self.close(code=4001)  # Unauthorized
                    return
            
            # Check if user has access to the conversation
            has_access = await self.check_conversation_access(user_id=str(self.user.id), conversation_id=self.room_name)
            if not has_access:
                logger.error(f"[WebSocket] User {self.user.id} does not have access to conversation {self.room_name}")
                await self.close(code=4003)  # Forbidden
                return
            
            # Add to the room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the connection
            await self.accept()
            logger.info(f"[WebSocket] Connection accepted for user {self.user.id} in conversation {self.room_name}")
            
            # Send a welcome message
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': 'WebSocket connection established',
                'user_id': str(self.user.id),
                'conversation_id': self.room_name,
                'timestamp': timezone.now().isoformat()
            }))
            logger.info("[WebSocket] Sent connection confirmation")
            
        except Exception as e:
            logger.error(f"[WebSocket] Error in connect: {str(e)}", exc_info=True)
            try:
                await self.close(code=4000)  # Internal error
            except:
                pass

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group if connected
        if hasattr(self, 'room_group_name') and self.room_group_name:
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f"[WebSocket] Disconnected from room group: {self.room_group_name}")
        else:
            logger.warning("[WebSocket] Disconnected without room_group_name")

    @database_sync_to_async
    def get_user(self, user_id):
        """Get user by ID"""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None
    
    @database_sync_to_async
    def check_conversation_access(self, user_id, conversation_id):
        """Check if user has access to the conversation"""
        try:
            logger.info(f"[WebSocket] Checking access for user {user_id} to conversation {conversation_id}")
            
            # Convert conversation_id to integer if it's a string
            try:
                if isinstance(conversation_id, str):
                    conversation_id = int(conversation_id)
            except (ValueError, TypeError) as e:
                logger.error(f"[WebSocket] Invalid conversation_id format: {conversation_id}. Error: {str(e)}")
                return False
            
            # Get the conversation
            try:
                conversation = Conversation.objects.get(id=conversation_id)
                logger.info(f"[WebSocket] Found conversation: {conversation.id}")
            except Conversation.DoesNotExist:
                logger.error(f"[WebSocket] Conversation not found: {conversation_id}")
                return False
            except Exception as e:
                logger.error(f"[WebSocket] Error getting conversation: {str(e)}", exc_info=True)
                return False
            
            # Check if user is a participant
            try:
                is_participant = conversation.participants.filter(id=user_id).exists()
                participant_count = conversation.participants.count()
                logger.info(f"[WebSocket] User {user_id} is {'a' if is_participant else 'not a'} participant. Total participants: {participant_count}")
                return is_participant
                
            except Exception as e:
                logger.error(f"[WebSocket] Error checking participant status: {str(e)}", exc_info=True)
                return False
                
        except Exception as e:
            logger.error(f"[WebSocket] Unexpected error in check_conversation_access: {str(e)}", exc_info=True)
            return False
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            logger.info(f"[WebSocket] Raw message received: {text_data}")
            
            try:
                text_data_json = json.loads(text_data)
                message_type = text_data_json.get('type')
                logger.info(f"[WebSocket] Processing message of type: {message_type}")
            except json.JSONDecodeError as e:
                logger.error(f"[WebSocket] Invalid JSON received: {text_data}")
                return

            if message_type == 'chat.message':
                try:
                    message_content = text_data_json.get('content', '').strip()
                    conversation_id = text_data_json.get('conversation_id')
                    temp_id = text_data_json.get('temp_id')
                    
                    if not message_content or not conversation_id:
                        logger.error(f"[WebSocket] Missing required fields in message: {text_data_json}")
                        return
                        
                    logger.info(f"[WebSocket] Saving message for conversation {conversation_id}")
                    
                    # Save message to database
                    message = await self.save_message(
                        user_id=str(self.user.id),
                        conversation_id=conversation_id,
                        content=message_content
                    )
                    
                    if not message:
                        logger.error("[WebSocket] Failed to save message to database")
                        return
                        
                    logger.info(f"[WebSocket] Message saved with ID: {message.id}")
                    
                    # Prepare message data for broadcasting
                    message_data = {
                        'type': 'chat.message',
                        'message_id': str(message.id),
                        'content': message.content,
                        'sender': {
                            'id': str(message.sender.id),
                            'email': message.sender.email,
                            'first_name': message.sender.first_name,
                            'last_name': message.sender.last_name,
                        },
                        'conversation_id': str(conversation_id),
                        'timestamp': message.timestamp.isoformat(),
                        'is_read': message.is_read,
                        'temp_id': temp_id  # Include the temp_id for client-side reference
                    }
                    
                    # Broadcast to all in the room
                    await self.channel_layer.group_send(
                        f'chat_{conversation_id}',
                        message_data
                    )
                    
                    logger.info(f"[WebSocket] Message broadcasted to room chat_{conversation_id}")
                    
                except Exception as e:
                    logger.error(f"[WebSocket] Error processing chat message: {str(e)}", exc_info=True)
                    # Send error back to sender
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'error': 'Failed to process message',
                        'temp_id': temp_id  # Include temp_id for client-side error handling
                    }))
                    
            else:
                logger.warning(f"[WARNING] Unhandled message type: {message_type}")
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'error': f'Unhandled message type: {message_type}',
                    'code': 'unhandled_message_type'
                }))
                
        except json.JSONDecodeError as e:
            error_msg = f'Invalid JSON format: {str(e)}'
            logger.error(f"[ERROR] {error_msg}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': error_msg,
                'code': 'invalid_json'
            }))
            
        except Exception as e:
            error_msg = f'Error processing message: {str(e)}'
            logger.error(f"[ERROR] {error_msg}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': error_msg,
                'code': 'server_error'
            }))

    async def chat_message(self, event):
        """Handle chat message event"""
        try:
            # Skip if this is the sender's own message (they already have it)
            if str(self.user.id) == event.get('sender', {}).get('id'):
                logger.debug("[WebSocket] Skipping echo of own message")
                return
                
            logger.info(f"[WebSocket] Sending message to client: {event.get('message_id')}")
            
            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'type': 'chat.message',
                'message_id': event['message_id'],
                'content': event['content'],
                'sender': event['sender'],
                'timestamp': event['timestamp'],
                'is_read': event.get('is_read', False),
                'conversation_id': event['conversation_id'],
                'temp_id': event.get('temp_id')  # Pass through temp_id if present
            }))
            
            logger.debug(f"[WebSocket] Message {event.get('message_id')} sent to client")
            
        except Exception as e:
            logger.error(f"[WebSocket] Error in chat_message: {str(e)}", exc_info=True)
            # Try to send an error response if possible
            try:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'error': 'Failed to process incoming message',
                    'details': str(e)
                }))
            except:
                pass

    async def user_typing(self, event):
        """Handle typing indicator"""
        try:
            # Don't send the typing notification back to the sender
            if str(self.user.id) != event['user_id']:
                await self.send(text_data=json.dumps({
                    'type': 'user.typing',
                    'user_id': event['user_id'],
                    'user_name': event['user_name'],
                    'is_typing': event['is_typing'],
                    'conversation_id': self.room_name
                }))
        except Exception as e:
            logger.error(f"Error in user_typing: {str(e)}", exc_info=True)
            await self.send(text_data=json.dumps({
                'type': 'error',
                'error': f'Failed to handle typing indicator: {str(e)}'
            }))

    @database_sync_to_async
    def save_message(self, user_id, conversation_id, content):
        """Save message to database"""
        from django.utils import timezone
        from django.db import transaction
        from apps.messaging.models import Message, Conversation
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        try:
            logger.info(f"[DEBUG] save_message called with user_id={user_id}, content='{content[:50]}...'")
            
            with transaction.atomic():
                # Get the sender
                try:
                    sender = User.objects.get(id=user_id)
                    logger.info(f"[DEBUG] Found sender: {sender.email}")
                except User.DoesNotExist as e:
                    logger.error(f"[ERROR] User with ID {user_id} not found: {str(e)}")
                    raise ValueError(f"User with ID {user_id} not found")
                
                # Get the conversation
                try:
                    conversation = Conversation.objects.select_related().get(id=self.room_name)
                    logger.info(f"[DEBUG] Found conversation: {conversation.id} with {conversation.participants.count()} participants")
                except Conversation.DoesNotExist as e:
                    logger.error(f"[ERROR] Conversation with ID {self.room_name} not found: {str(e)}")
                    raise ValueError(f"Conversation with ID {self.room_name} not found")
                
                # Verify user is a participant
                is_participant = conversation.participants.filter(id=user_id).exists()
                logger.info(f"[DEBUG] Is user {user_id} a participant? {is_participant}")
                
                if not is_participant:
                    error_msg = f"User {user_id} is not a participant in conversation {self.room_name}"
                    logger.error(error_msg)
                    raise ValueError("You are not a participant in this conversation")
                
                # Create and save the message
                try:
                    logger.info("[DEBUG] Attempting to create message...")
                    
                    # Create the message
                    message = Message.objects.create(
                        conversation=conversation,
                        sender=sender,
                        content=content,
                        is_read=False
                    )
                    logger.info(f"[DEBUG] Created message with ID: {message.id}")
                    
                    # Update conversation's updated_at
                    conversation.updated_at = timezone.now()
                    conversation.save(update_fields=['updated_at'])
                    logger.info(f"[DEBUG] Updated conversation {conversation.id} timestamp to {conversation.updated_at}")
                    
                    # Verify the message was saved
                    message_count = Message.objects.filter(id=message.id).count()
                    logger.info(f"[DEBUG] Message count in DB: {message_count}")
                    
                    if message_count == 0:
                        logger.error("[ERROR] Message was not saved to the database!")
                        raise ValueError("Message was not saved to the database")
                    
                    # Return a dictionary with the message data
                    message_data = {
                        'id': message.id,
                        'content': message.content,
                        'conversation_id': str(conversation.id),
                        'sender_id': str(sender.id),
                        'timestamp': message.timestamp.isoformat(),
                        'is_read': message.is_read,
                        'sender': {
                            'id': str(sender.id),
                            'email': sender.email,
                            'first_name': getattr(sender, 'first_name', ''),
                            'last_name': getattr(sender, 'last_name', '')
                        }
                    }
                    
                    logger.info(f"[SUCCESS] Successfully saved message {message.id} in conversation {conversation.id}")
                    return type('MessageObject', (), message_data)
                    
                except Exception as e:
                    logger.error(f"[ERROR] Failed to create message: {str(e)}", exc_info=True)
                    raise ValueError(f"Failed to save message: {str(e)}")
                    
        except Exception as e:
            logger.error(f"[ERROR] Unexpected error in save_message: {str(e)}", exc_info=True)
            raise
