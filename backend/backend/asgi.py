import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import django
from django.conf import settings

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# This will load the Django application
django.setup()

# Now import the routing after Django is set up
from apps.notifications.routing import websocket_urlpatterns as notification_ws_urls
from apps.messaging.routing import websocket_urlpatterns as messaging_ws_urls
from chat.routing import websocket_urlpatterns as chat_ws_urls

# Combine WebSocket URL patterns
websocket_urlpatterns = notification_ws_urls + messaging_ws_urls + chat_ws_urls

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})