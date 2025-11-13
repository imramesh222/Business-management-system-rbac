#!/usr/bin/env python
import os
import django
import sys

# Add the project root to the Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

def setup_django():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

def generate_token():
    """Generate a JWT token for the given user ID"""
    from rest_framework_simplejwt.tokens import AccessToken
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # User ID for rawatramesh226@gmail.com
    user_id = "67a3fa4d-d295-4830-92a4-d202c539bdd4"
    
    try:
        user = User.objects.get(id=user_id)
        token = AccessToken.for_user(user)
        return {
            'user_id': str(user.id),
            'email': user.email,
            'token': str(token)
        }
    except User.DoesNotExist:
        raise Exception(f"User with ID {user_id} does not exist")
    except Exception as e:
        raise Exception(f"Error generating token: {str(e)}")

if __name__ == "__main__":
    try:
        setup_django()
        token_info = generate_token()
        print(f"User: {token_info['email']} (ID: {token_info['user_id']})")
        print(f"JWT Token: {token_info['token']}")
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
