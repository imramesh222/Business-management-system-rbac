from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404

from .models import Project
from .serializers import ProjectSerializer
from apps.clients.models import Client
from apps.organization.models import OrganizationMember, OrganizationRoleChoices
from apps.users.permissions import IsAdmin, IsOrganizationMember


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsOrganizationMember]

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
        elif self.action in ['create', 'add_team_member']:
            # For these actions, we'll do custom permission checking inside the method
            return [IsAuthenticated()]
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

    @action(detail=True, methods=['post'], url_path='team-members')
    def add_team_member(self, request, pk=None):
        """
        Add a team member to the project.
        """
        project = self.get_object()
        
        # Debug logging
        print(f"\n=== DEBUG: Adding team member ===")
        print(f"User: {request.user} (ID: {request.user.id})")
        print(f"User is_staff: {request.user.is_staff}, is_superuser: {request.user.is_superuser}")
        print(f"Project ID: {project.id}")
        print(f"Project organization ID: {project.client.organization.id}")
        
        # Get the organization member for the current user
        try:
            # Get all memberships for the current user
            user_memberships = request.user.organization_memberships.all()
            print(f"User memberships count: {user_memberships.count()}")
            print(f"User memberships: {[f'{m.role} in org {m.organization.id}' for m in user_memberships]}")
            
            # Get the specific membership for this organization
            user_membership = request.user.organization_memberships.get(
                organization=project.client.organization
            )
            print(f"User role in project's org: {user_membership.role}")
            
        except OrganizationMember.DoesNotExist:
            print("User is not a member of the project's organization")
            return Response(
                {"error": "You are not a member of this organization"},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            print(f"Error getting user membership: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Error checking organization membership: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Check if user is admin or project manager
        if user_membership.role not in [
            OrganizationRoleChoices.ADMIN,
            OrganizationRoleChoices.PROJECT_MANAGER
        ]:
            print(f"Access denied: User role {user_membership.role} is not authorized")
            return Response(
                {"error": "You need to be an admin or project manager to add team members"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        user_id = request.data.get('user_id')
        print(f"Attempting to add user_id: {user_id}")
        
        if not user_id:
            return Response(
                {"error": "User ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Check if user is already a team member
            if project.team_members.filter(id=user_id).exists():
                return Response(
                    {"error": "This user is already a team member"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the organization member
            org_member = OrganizationMember.objects.get(
                id=user_id,
                organization=project.client.organization
            )
            print(f"Found org member: {org_member.user.email} (Role: {org_member.role})")
        
            # Add member to the project's team_members
            project.team_members.add(org_member)
            
            # Get updated team members for the response
            team_members_data = [{
                'id': member.id,
                'name': member.user.get_full_name() or member.user.email,
                'email': member.user.email,
                'role': member.get_role_display()
            } for member in project.team_members.all()]
            
            print("Team member added successfully")
            return Response({
                "status": "Team member added successfully",
                "team_members": team_members_data
            }, status=status.HTTP_200_OK)
        
        except OrganizationMember.DoesNotExist:
            print(f"Target user {user_id} not found in organization")
            return Response(
                {"error": "User not found in organization"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"Error adding team member: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        finally:
            print("=== END DEBUG ===\n")