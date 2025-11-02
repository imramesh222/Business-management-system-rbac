from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

# Import models
from .models import Project

# Import serializers
from .serializers import ProjectSerializer

# Import organization models
from apps.organization.models import OrganizationMember, OrganizationRoleChoices
from apps.users.permissions import IsAdmin, IsOrganizationMember

class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing projects.
    - Salespersons can create and view their own projects
    - Project managers can view and update projects they're assigned to
    - Admins can perform all actions
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]
    
    def perform_create(self, serializer):
        """
        Save the project instance and update project manager role if needed.
        """
        project = serializer.save(created_by=self.request.user)
        self._update_project_manager_role(project)
    
    def perform_update(self, serializer):
        """
        Update the project instance and update project manager role if changed.
        """
        project = serializer.save()
        self._update_project_manager_role(project)
    
    def _update_project_manager_role(self, project):
        """
        Update the role of the assigned project manager to 'project_manager' if not already set.
        """
        if project.project_manager and project.project_manager.role != OrganizationRoleChoices.PROJECT_MANAGER:
            project.project_manager.role = OrganizationRoleChoices.PROJECT_MANAGER
            project.project_manager.save(update_fields=['role'])
    
    def get_queryset(self):
        """
        Filter projects based on user's role and organization.
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        # If user is admin, return all projects when no organization filter is applied
        if user.is_staff or user.is_superuser:
            organization_id = self.request.query_params.get('organization')
            if organization_id:
                try:
                    queryset = queryset.filter(client__organization_id=organization_id)
                except (ValueError, TypeError):
                    raise ValidationError({'organization': 'Invalid organization ID'})
            return queryset
            
        # For regular users, only show projects they have access to
        user_orgs = user.organization_members.values_list('organization_id', flat=True)
        return queryset.filter(client__organization_id__in=user_orgs)
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions for this view.
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]
    
    def get_queryset(self):
        """
        Filter projects based on user's role and organization.
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        # If user is admin, return all projects when no organization filter is applied
        if user.is_staff or user.is_superuser:
            organization_id = self.request.query_params.get('organization')
            if organization_id:
                try:
                    # Try to convert to UUID if it's a number
                    if organization_id.isdigit():
                        from uuid import UUID, uuid4
                        # Convert numeric ID to UUID by padding with zeros
                        padded_id = organization_id.zfill(32)
                        organization_id = str(UUID(padded_id))
                    return queryset.filter(client__organization_id=organization_id)
                except (ValueError, AttributeError):
                    return queryset.none()
            return queryset
            
        # For regular users, return only their organization's projects
        if hasattr(user, 'organization_id') and user.organization_id:
            return queryset.filter(client__organization_id=user.organization_id)
            
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign a project to a user."""
        project = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {"error": "User ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Add your assignment logic here
        # Example: project.assigned_to_id = user_id
        # project.save()
        
        return Response(
            {"status": "Project assigned successfully"},
            status=status.HTTP_200_OK
        )
        queryset = Project.objects.all()
        
        # If user is admin, return all projects
        if user.is_staff or user.is_superuser:
            return queryset
            
        # Get organization member record if exists
        try:
            member = OrganizationMember.objects.get(user=user)
        except OrganizationMember.DoesNotExist:
            return queryset.none()
            
        # Filter based on role
        if member.role == OrganizationRoleChoices.SALESPERSON:
            return queryset.filter(salesperson=member)
        elif member.role == OrganizationRoleChoices.PROJECT_MANAGER:
            return queryset.filter(project_manager=member)
        elif member.role == OrganizationRoleChoices.VERIFIER:
            return queryset.filter(verifier=member)
            
        return queryset.none()
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify a project (for verifiers)
        """
        project = self.get_object()
        project.is_verified = True
        project.verifier = get_object_or_404(OrganizationMember, user=request.user, role=OrganizationRoleChoices.VERIFIER)
        project.save()
        
        serializer = self.get_serializer(project)
        return Response(serializer.data)
