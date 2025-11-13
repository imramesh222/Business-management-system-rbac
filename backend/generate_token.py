#!/usr/bin/env python
import os
import django

def generate_token():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    
    from rest_framework_simplejwt.tokens import AccessToken
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Replace with your user ID or email
    user_id = "67a3fa4d-d295-4830-92a4-d202c539bdd4"
    
    try:
        user = User.objects.get(id=user_id)
        token = AccessToken.for_user(user)
        print(f"New JWT Token: {token}")
        return str(token)
    except User.DoesNotExist:
        print(f"User with ID {user_id} not found")
        return None

if __name__ == "__main__":
    generate_token()
