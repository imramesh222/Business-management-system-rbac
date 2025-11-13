import asyncio
import websockets
import json
import logging
import time
from datetime import datetime
from urllib.parse import urlencode

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
WS_BASE_URL = "ws://localhost:8000/ws/chat"
CONVERSATION_ID = "3"  # Using conversation ID 3 from the database
USER_ID = "67a3fa4d-d295-4830-92a4-d202c539bdd4"  # rawatramesh226@gmail.com
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYzMDIzNTE5LCJpYXQiOjE3NjMwMTk5MTksImp0aSI6IjlhMWQ4ZDE5NzBhZjQzYjE5NjJlODFmYTViNTE4YWYyIiwidXNlcl9pZCI6IjY3YTNmYTRkLWQyOTUtNDgzMC05MmE0LWQyMDJjNTM5YmRkNCJ9.21hvKNnqCzQyl6Zzuf-jf73izxXOweA5bZ5p9ebRN2E"

# Enable detailed logging for websockets and asyncio
logging.getLogger('websockets').setLevel(logging.DEBUG)
logging.getLogger('asyncio').setLevel(logging.DEBUG)

# Build WebSocket URL with query parameters
def get_websocket_url():
    params = {
        'token': JWT_TOKEN,
        'user_id': USER_ID
    }
    query_string = urlencode(params)
    return f"{WS_BASE_URL}/{CONVERSATION_ID}/?{query_string}"

async def test_websocket():
    ws_url = get_websocket_url()
    logger.info(f"Connecting to WebSocket at {ws_url}")
    
    try:
        # Connect to the WebSocket server with a longer timeout
        async with websockets.connect(
            ws_url,
            ping_interval=20,
            ping_timeout=20,
            close_timeout=20,
            max_size=2**25  # 32MB max message size
        ) as websocket:
            logger.info("WebSocket connection established")
            
            # Wait for the connection to be fully established
            try:
                welcome = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                logger.info(f"Server welcome: {welcome}")
            except asyncio.TimeoutError:
                logger.warning("No welcome message received (timeout)")
            
            # Prepare a test message with the correct user ID
            message = {
                'type': 'chat.message',
                'content': f'Test message from Python at {datetime.now().isoformat()}',
                'conversation_id': CONVERSATION_ID,
                'sender_id': USER_ID,  # Use the same user ID as in the token
                'timestamp': datetime.now().isoformat()
            }
            
            # Send the message
            message_json = json.dumps(message)
            logger.info(f"Sending message: {message_json}")
            await websocket.send(message_json)
            
            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received response: {response}")
                
                # Try to parse the response as JSON
                try:
                    response_data = json.loads(response)
                    if 'error' in response_data:
                        logger.error(f"Error from server: {response_data['error']}")
                    elif 'message' in response_data:
                        logger.info(f"Message saved with ID: {response_data.get('message_id', 'unknown')}")
                except json.JSONDecodeError:
                    logger.info(f"Non-JSON response: {response}")
                    
            except asyncio.TimeoutError:
                logger.warning("No response received from server (timeout)")
            except Exception as e:
                logger.error(f"Error receiving response: {str(e)}")
                
            # Keep the connection open for a moment to receive any pending messages
            await asyncio.sleep(2)
            
            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received response: {response}")
                return json.loads(response)
            except asyncio.TimeoutError:
                logger.warning("No response received within timeout period")
                return None
                
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)
        raise

async def main():
    try:
        await test_websocket()
    except websockets.exceptions.InvalidURI as e:
        logger.error(f"Invalid WebSocket URL: {str(e)}")
    except websockets.exceptions.InvalidHandshake as e:
        logger.error(f"WebSocket handshake failed: {str(e)}")
    except websockets.exceptions.ConnectionClosedError as e:
        logger.error(f"WebSocket connection closed unexpectedly: {str(e)}")
    except Exception as e:
        logger.error(f"Test failed: {str(e)}", exc_info=True)
        raise
    finally:
        # Add a small delay to ensure all logs are written
        await asyncio.sleep(0.1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)