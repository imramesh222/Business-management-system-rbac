from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import logging
from apps.users.serializers.auth_serializers import CustomTokenObtainPairSerializer

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Generate a JWT token for a user and show its contents'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f'Found user: {user.email} (ID: {user.id})'))
            
            # Get organization memberships
            org_memberships = user.organization_memberships.all()
            self.stdout.write(f'\nOrganization Memberships ({org_memberships.count()}):')
            for m in org_memberships:
                self.stdout.write(f'- {m.organization.name} (ID: {m.organization_id})')
                self.stdout.write(f'  Role: {m.role}')
                self.stdout.write(f'  Is Active: {m.is_active}')
            
            # Generate token using our custom serializer
            refresh = CustomTokenObtainPairSerializer.get_token(user)
            access_token = str(refresh.access_token)
            
            # For testing, we'll just use the token we already have
            token_data = {
                'access': access_token,
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': user.get_full_name() or user.email,
                    'role': refresh.payload.get('role', 'user')
                }
            }
            
            # Decode token to show payload
            import jwt
            from django.conf import settings
            
            try:
                # First try to decode without verification to see the payload
                payload = jwt.decode(access_token, options={"verify_signature": False})
                self.stdout.write('\nAccess Token Payload:')
                for key, value in payload.items():
                    self.stdout.write(f'{key}: {value}')
                
                self.stdout.write('\nAccess Token:')
                self.stdout.write(access_token)
                
                self.stdout.write('\nRefresh Token:')
                self.stdout.write(str(refresh))
                
                # Show the full token data from our serializer
                self.stdout.write('\nFull Token Data from Serializer:')
                for key, value in token_data.items():
                    if key not in ['access', 'refresh']:  # We've already shown these
                        self.stdout.write(f'{key}: {value}')
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error decoding token: {str(e)}'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} not found'))
