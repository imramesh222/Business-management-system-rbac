from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, permission_classes
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDay, TruncMonth
from apps.organization.models import Organization, OrganizationMember, OrganizationSubscription, PlanDuration, OrganizationRoleChoices
from apps.users.models import User
from apps.projects.models import Project
from apps.tasks.models import Task
from apps.clients.models import Client
from django.db.models import Prefetch, Count, Q

class DashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for handling dashboard-related operations.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Handle GET requests to the root endpoint of this viewset.
        This is called when accessing /api/v1/org/dashboard/metrics/
        """
        # Call the metrics action
        return self.metrics(request)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """
        Return dashboard metrics.
        This is called when accessing /api/v1/org/dashboard/metrics/
        """
        # Debug: Print request and user info
        print(f"Request user: {request.user}")
        print(f"Is authenticated: {request.user.is_authenticated}")
        
        # Get counts from database
        total_organizations = Organization.objects.count()
        total_members = User.objects.filter(is_active=True).count()
        
        # Debug: Print raw counts
        print(f"Total organizations in DB: {total_organizations}")
        print(f"Total members in DB: {total_members}")
        
        # Debug: Print all organizations
        print("All organizations:")
        for org in Organization.objects.all():
            print(f"- {org.name} (ID: {org.id}, Status: {org.status})")
        
        # Get active members (users who logged in within last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        active_members = User.objects.filter(
            last_login__gte=thirty_days_ago,
            is_active=True
        ).count()
        
        # Calculate monthly revenue (sum of all active subscriptions' plan prices)
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_revenue = OrganizationSubscription.objects.filter(
            is_active=True,
            start_date__lte=timezone.now(),
            end_date__gte=timezone.now()
        ).aggregate(total=Sum('plan_duration__price'))['total'] or 0
        
        # Calculate total revenue (sum of all subscription payments)
        total_revenue = OrganizationSubscription.objects.aggregate(
            total=Sum('plan_duration__price')
        )['total'] or 0
        
        # Get organization stats
        active_organizations = Organization.objects.filter(
            status='active'
        ).count()
        
        # Calculate member growth (new users in the last 30 days)
        new_members = User.objects.filter(
            date_joined__gte=thirty_days_ago
        ).count()
        
        metrics = {
            'total_organizations': total_organizations,
            'total_members': total_members,
            'active_members': active_members,
            'active_organizations': active_organizations,
            'monthly_revenue': float(monthly_revenue),
            'total_revenue': float(total_revenue),
            'new_members': new_members,
            'member_growth': round((new_members / (total_members - new_members)) * 100, 2) if total_members > new_members else 100,
            'storage_usage': 0,  # Implement storage usage logic if needed
            'storage_limit': 0,   # Implement storage limit logic if needed
        }
        
        # Debug: Print the metrics being returned
        print("\n=== METRICS BEING RETURNED ===")
        for key, value in metrics.items():
            print(f"{key}: {value}")
        print("=============================\n")
        
        # Wrap metrics in a 'metrics' object to match frontend expectations
        return Response({
            'metrics': metrics
        })

    @action(detail=False, methods=['get'])
    def activities(self, request):
        """
        Return recent activities for the dashboard.
        """
        # Get recent organization creations
        recent_orgs = Organization.objects.order_by('-created_at')[:5]
        
        # Get recent user signups
        recent_users = User.objects.filter(
            is_active=True
        ).order_by('-date_joined')[:5]
        
        # Format activities
        activities = []
        
        # Add organization activities
        for org in recent_orgs:
            activities.append({
                'id': str(org.id),
                'type': 'organization_created',
                'title': f'New Organization: {org.name}',
                'description': f'Organization {org.name} was created',
                'timestamp': org.created_at.isoformat(),
                'metadata': {
                    'organization_id': str(org.id),
                    'organization_name': org.name
                }
            })
        
        # Add user activities
        for user in recent_users:
            activities.append({
                'id': str(user.id),
                'type': 'user_registered',
                'title': f'New User: {user.email}',
                'description': f'User {user.email} registered',
                'timestamp': user.date_joined.isoformat(),
                'metadata': {
                    'user_id': str(user.id),
                    'email': user.email
                }
            })
        
        # Sort activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'count': len(activities),
            'next': None,
            'previous': None,
            'results': activities[:10]  # Return only the 10 most recent activities
        })


class ProjectManagerDashboardView(generics.RetrieveAPIView):
    """
    View for Project Manager dashboard.
    Returns projects and tasks assigned to the project manager.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        Return project manager dashboard data.
        """
        try:
            # Get the project manager's organization member record
            project_manager = request.user.organization_members.filter(
                role=OrganizationRoleChoices.PROJECT_MANAGER
            ).first()
            
            if not project_manager:
                return Response(
                    {"error": "User is not a project manager"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            organization = project_manager.organization
            
            # Get managed projects with related data
            managed_projects = Project.objects.filter(
                organization=organization,
                project_manager=project_manager
            ).select_related('client').prefetch_related(
                Prefetch('tasks', queryset=Task.objects.select_related('assigned_to__user'))
            ).order_by('-created_at')
            
            # Get team members (developers, designers, etc.) in the organization
            team_members = organization.members.filter(
                role__in=[
                    OrganizationRoleChoices.DEVELOPER,
                    OrganizationRoleChoices.DESIGNER,
                    OrganizationRoleChoices.QA
                ]
            ).select_related('user')
            
            # Get tasks assigned to team members
            team_tasks = Task.objects.filter(
                project__in=managed_projects,
                assigned_to__in=team_members
            ).select_related('project', 'assigned_to__user')
            
            # Prepare response data
            projects_data = []
            for project in managed_projects:
                project_tasks = [t for t in team_tasks if t.project_id == project.id]
                
                projects_data.append({
                    'id': str(project.id),
                    'title': project.title,
                    'status': project.status,
                    'client': {
                        'id': str(project.client.id),
                        'name': project.client.name
                    },
                    'progress': project.progress,
                    'deadline': project.deadline,
                    'total_tasks': project.total_tasks,
                    'completed_tasks': project.completed_tasks,
                    'team_members': [
                        {
                            'id': str(member.id),
                            'name': member.user.get_full_name() or member.user.email,
                            'role': member.get_role_display(),
                            'tasks_assigned': len([t for t in project_tasks if t.assigned_to_id == member.id]),
                            'tasks_completed': len([t for t in project_tasks 
                                                 if t.assigned_to_id == member.id and t.status == 'completed'])
                        }
                        for member in team_members
                    ]
                })
            
            # Get recent tasks for the project manager
            recent_tasks = Task.objects.filter(
                project__in=managed_projects
            ).order_by('-created_at')[:10]
            
            return Response({
                'projects': projects_data,
                'recent_tasks': [
                    {
                        'id': str(task.id),
                        'title': task.title,
                        'status': task.status,
                        'priority': task.priority,
                        'due_date': task.due_date,
                        'project': {
                            'id': str(task.project.id),
                            'title': task.project.title
                        },
                        'assigned_to': {
                            'id': str(task.assigned_to.id) if task.assigned_to else None,
                            'name': task.assigned_to.user.get_full_name() if task.assigned_to else 'Unassigned'
                        } if task.assigned_to else None
                    }
                    for task in recent_tasks
                ],
                'stats': {
                    'total_projects': len(projects_data),
                    'active_projects': len([p for p in projects_data if p['status'] == 'in_progress']),
                    'total_team_members': team_members.count(),
                    'pending_tasks': team_tasks.filter(status='pending').count(),
                    'in_progress_tasks': team_tasks.filter(status='in_progress').count(),
                    'completed_tasks': team_tasks.filter(status='completed').count(),
                }
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrganizationAdminDashboardView(generics.RetrieveAPIView):
    """
    View for organization admin dashboard.
    Returns organization-specific metrics and data for admin users.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, *args, **kwargs):
        """
        Return organization admin dashboard data.
        """
        # Get the organization of the current user
        try:
            org_member = request.user.organization_members.first()
            if not org_member:
                return Response(
                    {"error": "User is not a member of any organization"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            organization = org_member.organization
            
            # Get organization stats
            total_members = organization.members.count()
            active_members = organization.members.filter(
                user__is_active=True,
                user__last_login__gte=timezone.now() - timedelta(days=30)
            ).count()
            
            # Get project stats
            projects = organization.projects.all()
            total_projects = projects.count()
            active_projects = projects.filter(status='in_progress').count()
            
            # Get recent activities (last 10)
            recent_activities = organization.activities.order_by('-created_at')[:10]
            
            return Response({
                'organization': {
                    'id': str(organization.id),
                    'name': organization.name,
                    'status': organization.status,
                    'total_members': total_members,
                    'active_members': active_members,
                    'total_projects': total_projects,
                    'active_projects': active_projects,
                    'created_at': organization.created_at,
                    'subscription': {
                        'plan': organization.current_subscription.plan_duration.plan.name if hasattr(organization, 'current_subscription') else None,
                        'status': organization.current_subscription.status if hasattr(organization, 'current_subscription') else None,
                        'end_date': organization.current_subscription.end_date if hasattr(organization, 'current_subscription') else None,
                    } if hasattr(organization, 'current_subscription') else None
                },
                'recent_activities': [
                    {
                        'id': str(activity.id),
                        'action': activity.action,
                        'details': activity.details,
                        'created_at': activity.created_at,
                        'user': {
                            'id': str(activity.user.id),
                            'name': activity.user.get_full_name() or activity.user.email,
                        }
                    } for activity in recent_activities
                ]
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )