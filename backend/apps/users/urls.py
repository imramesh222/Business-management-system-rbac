from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

# Import views from their respective modules
from .views import (
    UserRegisterView, 
    UserRoleUpdateView, 
    UserViewSet
)

# Import auth views from the views package
from .views.auth_views import (
    ForgotPasswordView,
    ResetPasswordView,
    PasswordResetConfirmView
)
from .serializers import CustomTokenObtainPairSerializer

# Define the application namespace
app_name = 'users'

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

# Additional URL patterns that don't fit into ViewSets
urlpatterns = [
    # User registration - using dedicated view with CSRF exemption handled in the view
    path('register/', UserRegisterView.as_view(), name='user-register'),
    
    # JWT Authentication endpoints
    path('token/', TokenObtainPairView.as_view(serializer_class=CustomTokenObtainPairSerializer), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Current user profile endpoints
    path('me/', UserViewSet.as_view({'get': 'me'}), name='user-me'),
    path('me/update/', UserViewSet.as_view({'patch': 'update_me'}), name='user-update-me'),
    
    # User role management (admin only)
    path('<uuid:user_id>/update-role/', UserRoleUpdateView.as_view(), name='user-update-role'),
    
    # Include router URLs last
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('auth/', include('rest_framework.urls', namespace='rest_framework')),
    
    # Password reset endpoints
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/reset-password/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
]
