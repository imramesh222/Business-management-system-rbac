from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'messages', views.MessageViewSet, basename='message')

# WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/chat/<uuid:conversation_id>/', views.ChatConsumer.as_asgi()),
]

urlpatterns = [
    path('', include(router.urls)),
]
