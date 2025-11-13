#!/usr/bin/env python
import os
import django

def setup_django():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

def list_conversations():
    from apps.messaging.models import Conversation
    
    print("\n=== Available Conversations ===")
    conversations = Conversation.objects.all().order_by('-updated_at')
    
    if not conversations.exists():
        print("No conversations found in the database.")
        return []
    
    for conv in conversations:
        participants = ", ".join([f"{u.email} ({u.id})" for u in conv.participants.all()])
        print(f"\nID: {conv.id}")
        print(f"Name: {conv.name or 'N/A'}")
        print(f"Updated: {conv.updated_at}")
        print(f"Participants: {participants}")
        print(f"Message Count: {conv.messages.count()}")
    
    return list(conversations)

if __name__ == "__main__":
    setup_django()
    list_conversations()
