from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Project
from .serializers import ProjectSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.clients.models import Client


# Import organization models
from apps.organization.models import OrganizationMember, OrganizationRoleChoices
from apps.users.permissions import IsAdmin, IsOrganizationMember

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        """
        Create a new project.
        """
        # Make a mutable copy of the request data
        data = request.data.copy()
        
        # If project_manager is in the data, ensure it's a valid project manager
        project_manager_id = data.get('project_manager')
        if project_manager_id:
            try:
                project_manager = OrganizationMember.objects.get(
                    id=project_manager_id,
                    role=OrganizationRoleChoices.PROJECT_MANAGER
                )
                # Ensure the project manager is from the same organization as the client
                client_id = data.get('client')
                if client_id:
                    client = Client.objects.get(id=client_id)
                    if project_manager.organization_id != client.organization_id:
                        return Response(
                            {"project_manager": "Project manager must belong to the same organization as the client"},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                # Set the project manager in the data
                data['project_manager_id'] = project_manager.id
            except OrganizationMember.DoesNotExist:
                return Response(
                    {"project_manager": "Invalid project manager ID or not a project manager"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Now validate and save with the updated data
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()
        
        # Log the project creation
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Created project {project.id} with project manager {project_manager_id}")
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        elif self.action == 'create':
            return [IsAuthenticated(), IsOrganizationMember()]
        return [IsAuthenticated(), IsAdmin()]
        
    
    def get_queryset(self):
        """
        Filter projects based on user's role, organization, and project manager assignment.
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
                        from uuid import UUID
                        # Convert numeric ID to UUID by padding with zeros
                        padded_id = organization_id.zfill(32)
                        organization_id = str(UUID(padded_id))
                    return queryset.filter(client__organization_id=organization_id)
                except (ValueError, AttributeError):
                    return queryset.none()
            return queryset
        
        # Check if the user is a project manager
        try:
            # Get the organization member record for this user
            org_member = OrganizationMember.objects.filter(user=user).first()
            
            # If user is a project manager, return their projects
            if org_member and org_member.role == OrganizationRoleChoices.PROJECT_MANAGER:
                return queryset.filter(project_manager=org_member)
                
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error checking project manager status for user {user.id}", exc_info=True)
            
        # For regular users, first try to get organization from user.organization_id
        if hasattr(user, 'organization_id') and user.organization_id:
            return queryset.filter(client__organization_id=user.organization_id)
            
        # Then try to get organizations through organization_memberships
        if hasattr(user, 'organization_memberships'):
            try:
                user_orgs = user.organization_memberships.values_list('organization_id', flat=True)
                if user_orgs.exists():
                    return queryset.filter(client__organization_id__in=user_orgs)
            except Exception:
                # If there's any error with organization_memberships, log it and continue
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error accessing organization_memberships for user {user.id}", exc_info=True)
        
        # If no organization is found, return empty queryset
        return queryset.none()
    
    
    def perform_create(self, serializer):
        """
        Save the project instance and update project manager role if needed.
        """
        project = serializer.save()
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
