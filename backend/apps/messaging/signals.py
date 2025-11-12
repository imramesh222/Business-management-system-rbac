from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Message
from .tasks import send_message_notification

@receiver(post_save, sender=Message)
def handle_new_message(sender, instance, created, **kwargs):
    """
    Handle new message creation
    """
    if created:
        # Send real-time notification via WebSocket
        send_message_notification.delay(
            message_id=instance.id,
            conversation_id=str(instance.conversation.id),
            sender_id=str(instance.sender.id)
        )
        
        # Update conversation's updated_at
        instance.conversation.save(update_fields=['updated_at'])

@receiver(pre_save, sender=Message)
def update_message_timestamp(sender, instance, **kwargs):
    """
    Update the timestamp when a message is modified
    """
    if not instance.pk:  # New message
        instance.timestamp = timezone.now()
