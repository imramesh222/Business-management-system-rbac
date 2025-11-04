from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class Command(BaseCommand):
    help = 'Clear all refresh tokens for a specific user'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email of the user to clear tokens for')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f'Found user: {user.email} (ID: {user.id})'))
            
            # In a real implementation, you would clear the tokens here
            # For now, we'll just log that we would clear them
            self.stdout.write(self.style.WARNING('In a real implementation, this would clear all tokens for the user'))
            self.stdout.write(self.style.SUCCESS('To fully clear tokens, the user should log out from all devices'))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} not found'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'An error occurred: {str(e)}'))
