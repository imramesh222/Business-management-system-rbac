import os
import django
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework_simplejwt.tokens import AccessToken

def get_token_for_user(user_id):
    """Generate a new JWT token for the given user ID"""
    token = AccessToken.for_user(user_id)
    token.set_exp(from_time=datetime.utcnow() + timedelta(days=1))  # Token valid for 1 day
    return str(token)

if __name__ == "__main__":
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Replace with your user ID or email
    user_id = "67a3fa4d-d295-4830-92a4-d202c539bdd4"
    
    try:
        user = User.objects.get(id=user_id)
        token = get_token_for_user(user)
        print(f"New JWT Token: {token}")
    except User.DoesNotExist:
        print(f"User with ID {user_id} does not exist")
