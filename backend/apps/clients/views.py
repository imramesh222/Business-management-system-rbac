from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from apps.users.permissions import (
    IsAdmin, IsSalesperson, HasOrganizationAccess, IsProjectManager
)
from .models import Client
from .serializers import (
    ClientSerializer, ClientDetailSerializer, 
    ClientCreateSerializer, ClientUpdateSerializer
)


class HasOrganizationListAccess(BasePermission):
    """
    Custom permission for list actions that checks if the user has access to the organization
    based on query parameters or their assigned organization.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            print("Permission denied: User not authenticated")
            return False
            
        print(f"Checking permission for user: {request.user.email} with role: {request.user.role}")
            
        # Allow superadmins to access all organizations
        if request.user.role == 'superadmin':
            print("Access granted: Superadmin")
            return True
            
        # Get organization_id from query params
        organization_id = request.query_params.get('organization_id')
        print(f"Organization ID from query params: {organization_id}")
        
        # Check if user is a member of any organization
        org_membership = request.user.organization_memberships.filter(is_active=True).first()

        
        # For admin users
        if request.user.role == 'admin':
            print("User is admin, checking access...")
            if org_membership:
                print(f"Found organization membership: {org_membership.organization_id} with role {org_membership.role}")
                if not organization_id:
                    print("Access granted: Admin with no specific org requested")
                    return True
                return str(org_membership.organization_id) == str(organization_id)
            else:
                print("No organization membership found for admin, but allowing access")
                return True
            
        # For other roles
        if org_membership:
            print(f"User is member of organization: {org_membership.organization_id} with role {org_membership.role}")
            if not organization_id:
                return True
            return str(org_membership.organization_id) == str(organization_id)
            
        # For roles that should have access without specific organization
        if request.user.role in ['salesperson', 'project_manager']:
            print(f"Access granted: {request.user.role} role")
            return True
            
        print("Access denied: No matching conditions")
        return False


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients.
    - Superadmins can see all clients
    - Admins can see clients in their organization
    - Salespeople can see their own clients
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'contact', 'email', 'phone']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']

    def get_permissions(self):
        if self.action == 'list':
            permission_classes = [IsAuthenticated, HasOrganizationListAccess]
        elif self.action == 'retrieve':
            permission_classes = [IsAuthenticated, HasOrganizationAccess]
        elif self.action == 'create':
            permission_classes = [IsAuthenticated, IsAdmin | IsSalesperson | IsProjectManager]
        else:
            permission_classes = [IsAdmin | IsSalesperson | IsProjectManager]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        """
        Use different serializers for list and detail views.
        """
        if self.action == 'retrieve':
            return ClientDetailSerializer
        if self.action == 'create':
            return ClientCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ClientUpdateSerializer
        return ClientSerializer

    def get_queryset(self):
        """
        Filter clients based on the requesting user's role.
        """
        # Handle Swagger schema generation
        if getattr(self, 'swagger_fake_view', False):
            return Client.objects.none()
            
        user = self.request.user
        
        # Handle unauthenticated users
        if not user.is_authenticated:
            return Client.objects.none()
            
        queryset = super().get_queryset()

        # Apply filters from query params if provided
        organization_id = self.request.query_params.get('organization_id')
        if organization_id:
            queryset = queryset.filter(organization_id=organization_id)
            
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
            
        salesperson_id = self.request.query_params.get('salesperson')
        if salesperson_id:
            queryset = queryset.filter(salesperson_id=salesperson_id)

        # Apply role-based filtering
        if hasattr(user, 'role') and user.role == 'superadmin':
            return queryset
            
        if hasattr(user, 'role') and user.role == 'admin' and hasattr(user, 'organization'):
            return queryset.filter(organization=user.organization)
            
        # Salespeople can only see their own clients
        if hasattr(user, 'salesperson'):
            return queryset.filter(salesperson=user.salesperson)
            
        return Client.objects.none()

    def perform_create(self, serializer):
        """
        Set the salesperson to the current user and organization based on the salesperson's org.
        """
        user = self.request.user
        if hasattr(user, 'salesperson'):
            serializer.save(salesperson=user, organization=user.salesperson.organization)
        elif hasattr(user, 'admin'):
            # If admin is creating, they need to specify salesperson
            serializer.save(organization=user.admin.organization)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate a client account.
        """
        client = self.get_object()
        client.is_active = True
        client.save()
        return Response({'status': 'client activated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """
        Deactivate a client account.
        """
        client = self.get_object()
        client.is_active = False
        client.save()
        return Response({'status': 'client deactivated'}, status=status.HTTP_200_OK)
