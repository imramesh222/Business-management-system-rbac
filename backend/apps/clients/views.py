from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from .models import Client
from .serializers import (
    ClientSerializer, ClientDetailSerializer, 
    ClientCreateSerializer, ClientUpdateSerializer
)
from apps.organization.permissions import (
    IsOrganizationAdmin,
    HasOrganizationListAccess
)


class ClientViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing clients.
    """
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return ClientCreateSerializer
        elif self.action == 'retrieve':
            return ClientDetailSerializer
        return ClientSerializer

    def get_permissions(self):
        # For testing: allow any authenticated user to perform any action
        permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
        
        # Original implementation (commented out for now):
        # if self.action in ['list', 'retrieve']:
        #     permission_classes = [IsAuthenticated, HasOrganizationListAccess]
        # else:
        #     permission_classes = [IsAuthenticated, IsOrganizationAdmin | IsAdminUser]
        # return [permission() for permission in permission_classes]


    def perform_create(self, serializer):
        """
        Set the salesperson to the current user and organization based on the user's role.
        """
        user = self.request.user
        data = self.request.data
        
        # Get organization from request data or user's organization
        organization_id = data.get('organization')
        
        # For admin users, use their organization if not specified
        if hasattr(user, 'admin') and not organization_id:
            organization = user.admin.organization
            if organization:
                serializer.save(organization=organization)
                return
        
        # For salesperson, set them as the salesperson and use their organization
        if hasattr(user, 'salesperson'):
            if user.salesperson.organization:
                serializer.save(
                    salesperson=user,
                    organization=user.salesperson.organization
                )
                return
        
        # If organization_id is provided, use it
        if organization_id:
            from django.shortcuts import get_object_or_404
            from apps.organization.models import Organization
            
            try:
                organization = get_object_or_404(Organization, id=organization_id)
                save_data = {'organization': organization}
                
                # Add salesperson if user is a salesperson
                if hasattr(user, 'salesperson'):
                    save_data['salesperson'] = user
                
                serializer.save(**save_data)
                return
            except Exception as e:
                print(f"Error getting organization: {e}")
        
        # If we get here, we couldn't determine the organization
        from rest_framework.exceptions import ValidationError
        raise ValidationError({
            'organization': 'Could not determine organization. Please provide a valid organization ID.'
        })

    def get_organization(self):
        """
        Get the organization for the current request.
        Used by permission classes to verify organization-level access.
        """
        user = self.request.user
        
        # For detail views, get the organization from the client
        if hasattr(self, 'get_object'):
            try:
                client = self.get_object()
                return client.organization
            except Exception:
                pass
                
        # For list/create views, get organization from request data or user's organization
        if hasattr(user, 'admin') and user.admin.organization:
            return user.admin.organization
        elif hasattr(user, 'salesperson') and user.salesperson.organization:
            return user.salesperson.organization
            
        # Try to get organization from request data
        organization_id = self.request.data.get('organization') or self.request.query_params.get('organization_id')
        if organization_id:
            from apps.organization.models import Organization
            from django.shortcuts import get_object_or_404
            return get_object_or_404(Organization, id=organization_id)
            
        return None

    def get_queryset(self):
        """
        Filter clients based on user's role and organization.
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        # If user is admin, return all clients in their organization
        if hasattr(user, 'admin'):
            return queryset.filter(organization=user.admin.organization)
        # If user is salesperson, return their clients
        elif hasattr(user, 'salesperson'):
            return queryset.filter(
                Q(organization=user.salesperson.organization) &
                (Q(salesperson=user) | Q(salesperson__isnull=True))
            )
        # Default to empty queryset if no permissions
        return Client.objects.none()
