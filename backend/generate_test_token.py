import os
import sys
import json
import logging
from datetime import datetime

def setup_django():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    import django
    django.setup()
    return django

def main():
    # Set up Django
    django = setup_django()
    
    # Import necessary modules
    from rest_framework_simplejwt.tokens import RefreshToken
    from apps.users.models import User
    
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    try:
        # Get the user
        email = 'roshanrokaya413@gmail.com'
        user = User.objects.get(email=email)
        logger.info(f"Found user: {user.email} (ID: {user.id})")
        
        # Get organization membership
        from apps.organization.models import OrganizationMember
        org_member = OrganizationMember.objects.filter(user=user, is_active=True).first()
        
        if org_member:
            logger.info(f"Organization membership: {org_member.organization.name} as {org_member.role}")
        else:
            logger.warning("No active organization membership found")
        
        # Generate a new token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        # Print the token and its payload
        logger.info("\n=== GENERATED TOKEN ===")
        logger.info(f"Access Token: {access_token}")
        
        # Decode the token to verify the payload
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        
        try:
            # This will validate the token and return the payload
            token = UntypedToken(access_token)
            payload = token.payload
            
            # Format the expiration time
            exp_timestamp = payload.get('exp')
            if exp_timestamp:
                exp_datetime = datetime.fromtimestamp(exp_timestamp)
                payload['exp'] = f"{exp_timestamp} ({exp_datetime.isoformat()})"
            
            # Print the decoded payload
            logger.info("\n=== DECODED PAYLOAD ===")
            logger.info(json.dumps(payload, indent=2))
            
            # Print the user data that would be sent in the login response
            from apps.users.serializers.auth_serializers import CustomTokenObtainPairSerializer
            from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
            
            logger.info("\n=== TOKEN GENERATION TEST ===")
            logger.info(f"Using token serializer: {CustomTokenObtainPairSerializer.__name__}")
            
            # Test the token generation
            token_serializer = CustomTokenObtainPairSerializer()
            token_serializer.user = user
            token = token_serializer.get_token(user)
            
            logger.info("\n=== CUSTOM TOKEN PAYLOAD ===")
            logger.info(json.dumps(dict(token), indent=2))
            
            # Test the validate method
            logger.info("\n=== VALIDATE METHOD OUTPUT ===")
            data = token_serializer.validate({})
            logger.info(json.dumps(data, indent=2))
            
        except (InvalidToken, TokenError) as e:
            logger.error(f"Token validation error: {str(e)}")
            
    except User.DoesNotExist:
        logger.error(f"User with email {email} not found")
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}", exc_info=True)

if __name__ == "__main__":
    main()
