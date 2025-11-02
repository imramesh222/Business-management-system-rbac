# This file makes the views available at the package level

# Import views from auth_views
from .auth_views import (
    ForgotPasswordView,
    ResetPasswordView,
    PasswordResetConfirmView
)

# Import views from user_views
from .user_views import (
    UserViewSet,
    UserRoleUpdateView,
    UserRegisterView
)

# Re-export all views
__all__ = [
    'UserViewSet',
    'UserRoleUpdateView',
    'UserRegisterView',
    'ForgotPasswordView',
    'ResetPasswordView',
    'PasswordResetConfirmView',
]
