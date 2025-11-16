from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from .models import Task
from .serializers import TaskSerializer, TaskListSerializer
from apps.users.permissions import IsAdmin, IsOrganizationMember
from apps.organization.models import OrganizationRoleChoices

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    """
    ViewSet for managing tasks.
    - Project managers can create, update, and view all tasks
    - Developers can update their own tasks and view assigned tasks
    - Admins can perform all actions
    """
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    
    def get_serializer_class(self):
        """Use different serializers for list and detail views."""
        if self.action == 'list':
            return TaskListSerializer
        return TaskSerializer
    
    def get_queryset(self):
        """
        Filter tasks based on user role:
        - Admins see all tasks
        - Project managers see tasks from their projects
        - Developers see only their assigned tasks
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        # If user is admin, return all tasks
        if user.is_staff or user.is_superuser:
            return queryset
            
        try:
            # Get the user's organization membership
            member = OrganizationMember.objects.get(user=user)
            
            # If user is a project manager, return tasks from their projects
            if member.role == OrganizationRoleChoices.PROJECT_MANAGER:
                return queryset.filter(project__project_manager=member)
                
            # If user is a developer, return their assigned tasks
            if member.role == OrganizationRoleChoices.DEVELOPER:
                return queryset.filter(assigned_to=member)
                
        except OrganizationMember.DoesNotExist:
            pass
            
        # Default: return empty queryset
        return Task.objects.none()
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [
                IsAdmin | 
                IsOrganizationMember(roles=[OrganizationRoleChoices.PROJECT_MANAGER])
            ]
        elif self.action in ['assign', 'complete']:
            permission_classes = [
                IsAdmin | 
                IsOrganizationMember(roles=[
                    OrganizationRoleChoices.PROJECT_MANAGER,
                    OrganizationRoleChoices.DEVELOPER
                ])
            ]
        else:
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() if not callable(permission) else permission 
                for permission in permission_classes]
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user."""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        Custom action to assign a task to a developer.
        Only project managers and admins can assign tasks.
        """
        task = self.get_object()
        developer_id = request.data.get('developer_id')
        
        if not developer_id:
            return Response(
                {'error': 'developer_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if the developer exists and belongs to the same organization
        from apps.organization.models import Developer
        try:
            developer = Developer.objects.get(id=developer_id)
            if developer.organization != task.project.organization:
                return Response(
                    {'error': 'Developer must be from the same organization as the project'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            task.developer = developer
            task.save()
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
        except Developer.DoesNotExist:
            return Response(
                {'error': 'Developer not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a task as completed.
        Only the assigned developer or project manager can complete a task.
        """
        task = self.get_object()
        user = request.user
        
        # Check if user is the assigned developer, project manager, or admin
        if (hasattr(user, 'developer') and task.developer == user.developer) or \
           (hasattr(user, 'projectmanager') and task.project.manager == user.projectmanager) or \
           user.is_staff or user.is_superuser:
               
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.save()
            serializer = self.get_serializer(task)
            return Response(serializer.data)
            
        return Response(
            {'error': 'You do not have permission to complete this task'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """
        Get tasks assigned to the current user (developer).
        """
        if not hasattr(request.user, 'developer'):
            return Response(
                {'error': 'Only developers have assigned tasks'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        tasks = Task.objects.filter(developer=request.user.developer)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)
