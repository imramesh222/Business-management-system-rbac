from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .consumers import ChatConsumer

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'messages', views.MessageViewSet, basename='message')

# WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/chat/<uuid:conversation_id>/', ChatConsumer.as_asgi()),
]

# Explicitly add the mark_as_read URL
urlpatterns = [
    path('', include(router.urls)),
    path('conversations/<uuid:pk>/mark_as_read/', 
         views.ConversationViewSet.as_view({'post': 'mark_as_read'}), 
         name='conversation-mark-as-read'),
]
