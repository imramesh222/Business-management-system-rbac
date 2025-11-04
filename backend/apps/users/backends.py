from django.contrib.auth import get_user_model, login
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.hashers import check_password
from django.contrib import messages
from django.urls import reverse
from django.shortcuts import redirect
from django.utils.translation import gettext_lazy as _

class CustomAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        
        try:
            # Try to find a user with the given username or email
            user = None
            if username:
                user = UserModel.objects.filter(username__iexact=username).first()
                if not user and '@' in username:
                    user = UserModel.objects.filter(email__iexact=username).first()
            
            # If user exists and password is correct
            if user and user.check_password(password):
                # Check if the user needs to change their password
                if hasattr(user, 'profile') and getattr(user.profile, 'password_change_required', False):
                    # Store in session that password change is required
                    request.session['password_change_required'] = True
                    request.session['user_id_for_password_change'] = str(user.id)
                    
                    # Store the user's ID in the session for the password change view
                    request.session['_auth_user_id'] = str(user.id)
                    request.session['_auth_user_backend'] = f"{self.__module__}.{self.__class__.__name__}"
                    
                    # Set a message to inform the user they need to change their password
                    messages.warning(
                        request,
                        _('Please change your temporary password to continue.')
                    )
                
                return user
                
        except UserModel.DoesNotExist:
            # Run the default password hasher once to prevent timing attacks
            UserModel().set_password(password)
            
        return None
    
    def get_user(self, user_id):
        UserModel = get_user_model()
        try:
            return UserModel._default_manager.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
