import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_websocket():
    # Your JWT token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYyOTQxNTYzLCJpYXQiOjE3NjI5Mzc5NjMsImp0aSI6IjNmYzNhNDI4ZThiMDQyNGY4M2NkOTNmYzBlYWNkZjc5IiwidXNlcl9pZCI6Ijc3MTBmOTgwLWQ4MjgtNGEwNC1iMDE0LTU4ZGRiNjhmMzYxNCIsImlzX3N1cGVydXNlciI6ZmFsc2UsImlzX3N0YWZmIjpmYWxzZSwib3JnYW5pemF0aW9uX2lkIjoiZDRiYjVmYzctYmMyZi00Nzk1LTkwNzYtMTU2M2E0YjRkMzYzIiwib3JnYW5pemF0aW9uX25hbWUiOiJNZXJvc2hhcmUiLCJyb2xlIjoiYWRtaW4iLCJvcmdhbml6YXRpb25fcm9sZSI6ImFkbWluIiwiX2RlYnVnX3JvbGUiOiJhZG1pbiIsIm5hbWUiOiJCaXN3YXMgUm9rYXlhIiwiZW1haWwiOiJpbWJpc3dhc3Jva2F5YUBnbWFpbC5jb20ifQ.HEr9AuuIMVG5lGpykhCXEzXg9bi-ShQ6aLX8PcptrQw"
    
    uri = f"ws://localhost:8000/ws/chat/?token={token}"
    
    try:
        logger.info(f"Attempting to connect to WebSocket at {uri}")
        
        # Set a longer timeout for the connection
        async with websockets.connect(uri, ping_interval=20, ping_timeout=20, close_timeout=10) as websocket:
            logger.info("Successfully connected to WebSocket server")
            
            # Listen for the welcome message
            welcome_msg = await websocket.recv()
            logger.info(f"Received welcome message: {welcome_msg}")
            
            # Test sending a message
            test_message = {
                "type": "chat.message",
                "message": "Hello from test script",
                "recipient_id": "7710f980-d828-4a04-b014-58ddb68f3614"  # Sending to self
            }
            
            logger.info(f"Sending test message: {test_message}")
            await websocket.send(json.dumps(test_message))
            
            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                logger.info(f"Received response: {response}")
            except asyncio.TimeoutError:
                logger.warning("No response received within timeout period")
            
            # Keep the connection open for a moment to see if we get any messages
            await asyncio.sleep(2)
            
    except websockets.exceptions.InvalidStatusCode as e:
        logger.error(f"Connection failed with status code {e.status_code}")
        if hasattr(e, 'response_headers'):
            logger.error(f"Response headers: {e.response_headers}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}", exc_info=True)

# Run the test
asyncio.get_event_loop().run_until_complete(test_websocket())
