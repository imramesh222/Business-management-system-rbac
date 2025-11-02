from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, authentication_classes, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
import json
import logging
from django.utils import timezone
from django.db.models import Q

from apps.users.serializers.user_serializers import UserSerializer
from apps.users.serializers.registration_serializers import UserRegistrationSerializer
from apps.organization.models import Organization, OrganizationMember, OrganizationRoleChoices
from apps.users.permissions import (
    IsSuperAdmin, 
    IsOrganizationAdmin, 
    IsSelfOrAdmin,
    IsAdminOrSelf
)
from apps.users.tasks import send_welcome_email_task

logger = logging.getLogger(__name__)
User = get_user_model()

def _process_registration_data(request_data, user=None):
    # Implementation of _process_registration_data
    pass

class UserRegisterView(APIView):
    """Class-based view for user registration.
    Supports both individual user registration and organization signup with subscription.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        """Handle POST request for user registration."""
        # Implementation of post method
        pass

class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management.
    - Superadmins can manage all users
    - Admins can manage users in their organization
    - Users can view/edit their own profile
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'list']:
            permission_classes = [IsAuthenticated, IsSuperAdmin]
        elif self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsAdminOrSelf]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Return the current user's information.
        This endpoint is used by the frontend to get the logged-in user's data.
        """
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
        
    # Other methods of UserViewSet...

class UserRoleUpdateView(APIView):
    """API endpoint to update a user's role.
    Accessible by superadmins and organization admins for users in their organization.
    """
    permission_classes = [IsAuthenticated]
    
    def is_user_in_organization(self, user, target_user):
        """Check if both users are in the same organization."""
        # Implementation
        pass
        
    def patch(self, request, user_id):
        # Implementation
        pass
