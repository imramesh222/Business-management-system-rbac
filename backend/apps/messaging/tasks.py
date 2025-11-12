from celery import shared_task
from django.core.cache import cache
from django.db.models import F
from .models import Message, Conversation

@shared_task(bind=True, max_retries=3)
def send_message_notification(self, message_id, conversation_id, sender_id):
    """
    Task to send real-time notifications for new messages
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        
        message = Message.objects.get(id=message_id)
        
        # Send WebSocket notification
        channel_layer = get_channel_layer()
        
        async_to_sync(channel_layer.group_send)(
            f'chat_{conversation_id}',
            {
                'type': 'chat.message',
                'message': message.content,
                'sender_id': str(sender_id),
                'timestamp': message.timestamp.isoformat(),
                'message_id': str(message.id)
            }
        )
        
        # Update unread count in cache
        cache_key = f'conversation_{conversation_id}_unread'
        try:
            cache.incr(cache_key)
        except ValueError:
            # Key doesn't exist, set it
            cache.set(cache_key, 1, timeout=3600 * 24)  # Cache for 24 hours
            
        return True
    except Exception as e:
        # Retry the task with exponential backoff
        self.retry(exc=e, countdown=2 ** self.request.retries)

@shared_task
def mark_conversation_messages_as_read(conversation_id, user_id):
    """
    Mark all messages in a conversation as read for a specific user
    """
    updated = Message.objects.filter(
        conversation_id=conversation_id
    ).exclude(
        sender_id=user_id
    ).update(is_read=True)
    
    # Update cache
    cache_key = f'conversation_{conversation_id}_unread'
    cache.set(cache_key, 0, timeout=3600 * 24)  # Cache for 24 hours
    
    return updated

@shared_task
def generate_message_report(user_id, conversation_id=None):
    """
    Generate a message report (PDF/CSV) for a user
    """
    from io import StringIO
    import csv
    from django.http import HttpResponse
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
    from reportlab.lib import colors
    from .models import Message
    
    # Get messages
    messages = Message.objects.filter(conversation__participants=user_id)
    
    if conversation_id:
        messages = messages.filter(conversation_id=conversation_id)
    
    messages = messages.select_related('sender', 'conversation').order_by('-timestamp')
    
    def generate_csv():
        """Generate CSV report"""
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Timestamp', 'Conversation', 'Sender', 'Message', 'Read'])
        
        # Write data
        for msg in messages:
            writer.writerow([
                msg.timestamp.isoformat(),
                str(msg.conversation),
                msg.sender.email,
                msg.content,
                'Yes' if msg.is_read else 'No'
            ])
        
        return output.getvalue()
    
    def generate_pdf():
        """Generate PDF report"""
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="message_report.pdf"'
        
        doc = SimpleDocTemplate(response, pagesize=letter)
        elements = []
        
        # Prepare data
        data = [['Timestamp', 'Conversation', 'Sender', 'Message', 'Read']]
        for msg in messages:
            data.append([
                msg.timestamp.strftime('%Y-%m-%d %H:%M'),
                str(msg.conversation)[:20],
                msg.sender.email.split('@')[0],
                msg.content[:50] + '...' if len(msg.content) > 50 else msg.content,
                '✓' if msg.is_read else '✗'
            ])
        
        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('WORDWRAP', (0, 0), (-1, -1), 1),
        ]))
        
        elements.append(table)
        doc.build(elements)
        
        return response
    
    return {
        'csv': generate_csv(),
        'pdf': generate_pdf()
    }
