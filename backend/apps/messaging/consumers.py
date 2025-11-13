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
            self.room_name = self.scope['url_route']['kwargs']['conversation_id']
            self.room_group_name = f'chat_{self.room_name}'
            
            logger.info(f"[WebSocket] New connection attempt. Scope: {self.scope}")
            
            # Check if user is authenticated via session
            self.user = self.scope["user"]
            logger.info(f"[WebSocket] Initial user from scope: {self.user} (authenticated: {self.user.is_authenticated if hasattr(self.user, 'is_authenticated') else 'N/A'})")
            
            # If user is not authenticated, try token authentication
            if not self.user.is_authenticated:
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
                            
                        logger.info(f"[WebSocket] Authenticated as user: {self.user.id} ({self.user.email})")
                        
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
                'conversation_id': self.room_name
            }))
            logger.info("[WebSocket] Sent connection confirmation")
            
        except Exception as e:
            logger.error(f"[WebSocket] Error in connect: {str(e)}", exc_info=True)
            await self.close(code=4000)  # Internal error
            return
            
        # Join room group
            try:
                await self.channel_layer.group_add(
                    self.room_group_name,
                    self.channel_name
                )
                logger.info(f"[WebSocket] Added to room group: {self.room_group_name}")
            except Exception as e:
                logger.error(f"[WebSocket] Error joining room group: {str(e)}", exc_info=True)
                await self.close()
                return
            
            # Accept the connection
            await self.accept()
            logger.info(f"[WebSocket] Connection accepted for user {self.user.id} in conversation {self.room_name}")
            
            # Send connection confirmation
            try:
                await self.send(text_data=json.dumps({
                    'type': 'connection.established',
                    'message': 'WebSocket connection established',
                    'user_id': str(self.user.id),
                    'conversation_id': str(self.room_name)
                }))
                logger.info("[WebSocket] Sent connection confirmation")
            except Exception as e:
                logger.error(f"[WebSocket] Error sending connection confirmation: {str(e)}", exc_info=True)
            
        except Exception as e:
            logger.error(f"[WebSocket] Unexpected error in connect: {str(e)}", exc_info=True)
            try:
                await self.close()
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
            logger.info(f"[DEBUG] Raw message received: {text_data}")
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            logger.info(f"[DEBUG] Processing message of type: {message_type}")

            if message_type == 'chat.message':
                try:
                    # Get message content and validate
                    message_content = text_data_json.get('content', '').strip()
                    conversation_id = text_data_json.get('conversation_id', self.room_name)
                    
                    # Get sender information - handle both direct sender_id and sender object
                    sender_info = text_data_json.get('sender')
                    if sender_info and isinstance(sender_info, dict):
                        sender_id = str(sender_info.get('id', ''))
                        sender_email = sender_info.get('email', '')
                        sender_first_name = sender_info.get('first_name', '')
                        sender_last_name = sender_info.get('last_name', '')
                    else:
                        sender_id = str(text_data_json.get('sender_id', ''))
                        sender_email = ''
                        sender_first_name = ''
                        sender_last_name = ''
                    
                    # If no sender_id in message, use the authenticated user's ID
                    if not sender_id and hasattr(self, 'user') and self.user.is_authenticated:
                        sender_id = str(self.user.id)
                        logger.info(f"[DEBUG] Using authenticated user ID as sender: {sender_id}")
                    
                    logger.info(f"[DEBUG] Message content: '{message_content[:50]}...' for conversation: {conversation_id}, sender_id: {sender_id}")
                    
                    if not message_content:
                        error_msg = 'Message content cannot be empty'
                        logger.warning(error_msg)
                        await self.send(text_data=json.dumps({
                            'type': 'error', 
                            'error': error_msg,
                            'code': 'empty_message'
                        }))
                        return

                    if not conversation_id:
                        error_msg = 'Conversation ID is required'
                        logger.error(f"[ERROR] {error_msg}")
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'error': error_msg,
                            'code': 'missing_conversation_id'
                        }))
                        return
                    
                    if not sender_id:
                        error_msg = 'Sender ID is required'
                        logger.error(f"[ERROR] {error_msg}")
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'error': error_msg,
                            'code': 'missing_sender_id'
                        }))
                        return
                
                    logger.info(f"[DEBUG] Processing message from {sender_id} in conversation {conversation_id}")
                    
                    # Verify the user has access to this conversation
                    has_access = await self.check_conversation_access(user_id=sender_id, conversation_id=conversation_id)
                    if not has_access:
                        logger.error(f"[ERROR] User {sender_id} does not have access to conversation {conversation_id}")
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'error': 'You do not have access to this conversation',
                            'code': 'access_denied'
                        }))
                        return
                    
                    try:
                        # Get the sender from the database if we need more info
                        sender = await self.get_user(sender_id)
                        if not sender:
                            # If we can't find the user in the DB but have sender info from the frontend, use that
                            if sender_email or sender_first_name or sender_last_name:
                                logger.warning(f"[WARNING] User {sender_id} not found in database, using provided sender info")
                                sender = type('User', (), {
                                    'id': sender_id,
                                    'email': sender_email,
                                    'first_name': sender_first_name,
                                    'last_name': sender_last_name
                                })
                            else:
                                raise ValueError(f"User with ID {sender_id} not found")
                        
                        # Save the message and get the result
                        logger.info(f"[DEBUG] Attempting to save message from {sender_id} in conversation {conversation_id}")
                        message = await self.save_message(sender_id, message_content)
                        if not message:
                            raise ValueError("Failed to save message")
                            
                        logger.info(f"[SUCCESS] Saved message {message.id} to database")
                        
                        # Get the current time for the timestamp
                        from django.utils import timezone
                        timestamp = timezone.now()
                        
                        # Prepare the message data for broadcasting
                        message_data = {
                            'type': 'chat.message.new',
                            'message_id': str(message.id),
                            'content': message.content,
                            'conversation_id': str(conversation_id),
                            'sender': {
                                'id': str(sender.id),
                                'email': getattr(sender, 'email', sender_email),
                                'first_name': getattr(sender, 'first_name', sender_first_name or ''),
                                'last_name': getattr(sender, 'last_name', sender_last_name or ''),
                            },
                            'sender_id': str(sender.id),
                            'sender_name': f"{getattr(sender, 'first_name', sender_first_name or '')} {getattr(sender, 'last_name', sender_last_name or '')}".strip() or getattr(sender, 'email', sender_email or 'Unknown User'),
                            'timestamp': timestamp.isoformat(),
                            'is_read': False
                        }
                    
                        logger.info(f"[DEBUG] Prepared message data for broadcast: {json.dumps(message_data, default=str)}")
                        logger.info(f"[DEBUG] Sending message data: {json.dumps(message_data, indent=2)}")
                        
                        # Send the message to the room group
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            message_data
                        )
                        
                    except Exception as e:
                        error_msg = f"Error processing message: {str(e)}"
                        logger.error(f"[ERROR] {error_msg}", exc_info=True)
                        await self.send(text_data=json.dumps({
                            'type': 'error',
                            'error': error_msg,
                            'code': 'message_processing_error'
                        }))
                        return
                    
                    # Send a success response to the sender
                    await self.send(text_data=json.dumps({
                        'type': 'message.sent',
                        'message_id': str(message.id),
                        'status': 'delivered',
                        'timestamp': timestamp.isoformat()
                    }))
                    
                    logger.info(f"[SUCCESS] Broadcasted message {message.id} to group {self.room_group_name}")
                    
                except Exception as e:
                    logger.error(f"[ERROR] Failed to process message: {str(e)}", exc_info=True)
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'error': f'Failed to process message: {str(e)}',
                        'code': 'message_processing_error'
                    }))
                    return
            
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

    async def chat_message_new(self, event):
        """Handle chat.message.new event"""
        try:
            # Send the message to the WebSocket
            await self.send(text_data=json.dumps(event))
            logger.info(f"[DEBUG] Sent message to WebSocket: {event.get('message_id')}")
        except Exception as e:
            logger.error(f"[ERROR] Error sending message to WebSocket: {str(e)}", exc_info=True)
            # If we can't send the message, close the connection
            await self.close(code=1011)  # Internal error
    
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
    def save_message(self, sender_id, content):
        """Save message to database"""
        from django.utils import timezone
        from django.db import transaction
        from apps.messaging.models import Message, Conversation
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        try:
            logger.info(f"[DEBUG] save_message called with sender_id={sender_id}, content='{content[:50]}...'")
            
            with transaction.atomic():
                # Get the sender
                try:
                    sender = User.objects.get(id=sender_id)
                    logger.info(f"[DEBUG] Found sender: {sender.email}")
                except User.DoesNotExist as e:
                    logger.error(f"[ERROR] User with ID {sender_id} not found: {str(e)}")
                    raise ValueError(f"User with ID {sender_id} not found")
                
                # Get the conversation
                try:
                    conversation = Conversation.objects.select_related().get(id=self.room_name)
                    logger.info(f"[DEBUG] Found conversation: {conversation.id} with {conversation.participants.count()} participants")
                except Conversation.DoesNotExist as e:
                    logger.error(f"[ERROR] Conversation with ID {self.room_name} not found: {str(e)}")
                    raise ValueError(f"Conversation with ID {self.room_name} not found")
                
                # Verify user is a participant
                is_participant = conversation.participants.filter(id=sender_id).exists()
                logger.info(f"[DEBUG] Is user {sender_id} a participant? {is_participant}")
                
                if not is_participant:
                    error_msg = f"User {sender_id} is not a participant in conversation {self.room_name}"
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
