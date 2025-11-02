import sys
import logging
from datetime import timedelta

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Count, Q, Sum, F
from django.conf import settings

from .permissions import IsSuperAdmin, IsOrganizationAdmin

from apps.users.models import User
from apps.organization.models import Organization, OrganizationMember
from apps.projects.models import Project
from apps.projects.tasks import Task

from apps.clients.models import Client
from apps.support.models import SupportTicket
from apps.payments.models import Payment

# Ensure logger is properly configured
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Add console handler if not already configured
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

class BaseDashboardView(APIView):
    """Base view for all dashboard views with common functionality."""
    permission_classes = []
    
    def get_time_periods(self):
        now = timezone.now()
        return {
            'now': now,
            'today': now.date(),
            'yesterday': now.date() - timedelta(days=1),
            'week_ago': now.date() - timedelta(days=7),
            'month_ago': now.date() - timedelta(days=30),
            'start_of_week': now.date() - timedelta(days=now.weekday()),
            'start_of_month': now.replace(day=1).date()
        }
    
    def get_organization_context(self, user):
        """Get organization context for the user."""
        if user.is_superuser:
            return {
                'organizations': Organization.objects.all(),
                'current_organization': None
            }
        
        # For organization users, get their organizations
        memberships = OrganizationMember.objects.filter(user=user).select_related('organization')
        return {
            'organizations': [m.organization for m in memberships],
            'current_organization': memberships.first().organization if memberships.exists() else None
        }
    
    def get_common_context(self, request):
        """Get common context for all dashboard views."""
        context = {
            'user': request.user,
            'time_periods': self.get_time_periods(),
            'now': timezone.now()
        }
        context.update(self.get_organization_context(request.user))
        return context


class SuperAdminDashboardView(BaseDashboardView):
    """Dashboard view for super admin users."""
    permission_classes = [IsSuperAdmin]
    http_method_names = ['get']  # Explicitly allow GET requests
    
    def get(self, request, format=None):
        """
        Get dashboard data for super admin.
        """
        logger = logging.getLogger(__name__)
        
        try:
            # Log request details for debugging
            logger.info(f"=== DASHBOARD REQUEST START ===")
            logger.info(f"User: {request.user}")
            logger.info(f"Is authenticated: {request.user.is_authenticated}")
            logger.info(f"Is superuser: {request.user.is_superuser}")
            logger.info(f"Request headers: {dict(request.headers)}")
            
            if not request.user.is_authenticated:
                logger.error("User not authenticated for dashboard access")
                return Response(
                    {'detail': 'Authentication credentials were not provided.'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            if not request.user.is_superuser:
                logger.error(f"User {getattr(request.user, 'email', 'unknown')} is not authorized as superadmin")
                return Response(
                    {'detail': 'You do not have permission to access this resource.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get time period data
            logger.info("Getting time periods...")
            time_periods = self.get_time_periods()
            logger.info(f"Time periods: {time_periods}")
            
            # Debug: Print to stdout directly as a fallback
            print("\n=== DEBUG: Starting user query ===")
            print(f"Current user: {request.user} (superuser: {request.user.is_superuser})")
            
            try:
                # Get all users
                users_qs = User.objects.all().select_related('profile').order_by('-date_joined')
                print(f"\n[DEBUG] User Query: {users_qs.query}")
                
                # Execute the query
                users = list(users_qs)
                print(f"[SUCCESS] Retrieved {len(users)} users from database")
                
                # Print user details
                if users:
                    print("\n=== USER LIST ===")
                    for i, user in enumerate(users[:10], 1):
                        print(f"[{i}] User ID: {user.id}")
                        print(f"    Email: {user.email}")
                        print(f"    Active: {user.is_active}")
                        print(f"    Staff: {user.is_staff}")
                        print(f"    Superuser: {user.is_superuser}")
                        print(f"    Last Login: {user.last_login}")
                        print(f"    Date Joined: {user.date_joined}")
                    
                    if len(users) > 10:
                        print(f"... and {len(users) - 10} more users")
                else:
                    print("[WARNING] No users found in the database!")
                
                # Also log to file for persistence
                with open('/tmp/dashboard_debug.log', 'a') as f:
                    f.write(f"\n=== {timezone.now()} ===\n")
                    f.write(f"Retrieved {len(users)} users\n")
                    for user in users[:5]:
                        f.write(f"- {user.email} (ID: {user.id}, Active: {user.is_active})\n")
                
            except Exception as e:
                print(f"[ERROR] Failed to fetch users: {str(e)}")
                import traceback
                traceback.print_exc()
                users = []
            
            print("=== END: User query ===\n")
            
            orgs = Organization.objects.all()
            
            # Log basic counts
            total_users = len(users)
            logger.info(f"Total users in system: {total_users}")
            logger.info(f"Total organizations: {orgs.count()}")
            
            # Get all users with their organization memberships
            from django.db.models import Prefetch
            from apps.organization.models import OrganizationMember
            
            # Prefetch organization memberships for all users
            users = users.prefetch_related(
                Prefetch(
                    'organizationmember_set',
                    queryset=OrganizationMember.objects.select_related('organization'),
                    to_attr='memberships'
                )
            )
            
            # Prepare user data for response
            user_data = []
            for user in users:
                user_orgs = [{
                    'id': str(member.organization.id),
                    'name': member.organization.name,
                    'role': member.role
                } for member in getattr(user, 'memberships', [])]
                
                user_data.append({
                    'id': str(user.id),
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_active': user.is_active,
                    'last_login': user.last_login.isoformat() if user.last_login else None,
                    'date_joined': user.date_joined.isoformat(),
                    'organizations': user_orgs,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'profile': {
                        'phone_number': getattr(user.profile, 'phone_number', None),
                        'avatar': request.build_absolute_uri(user.profile.avatar.url) if hasattr(user, 'profile') and user.profile.avatar else None,
                    } if hasattr(user, 'profile') else None
                })
            
            # Calculate metrics with detailed error handling
            try:
                logger.info("Counting active projects...")
                try:
                    active_projects = Project.objects.filter(is_verified=True).count()
                    logger.info(f"Found {active_projects} active projects")
                except Exception as e:
                    logger.error(f"Error counting active projects: {str(e)}", exc_info=True)
                    active_projects = 0
                
                logger.info("Calculating member growth...")
                try:
                    member_growth = users.filter(
                        date_joined__date__gte=time_periods['month_ago']
                    ).count()
                    logger.info(f"Found {member_growth} new members")
                except Exception as e:
                    logger.error(f"Error calculating member growth: {str(e)}", exc_info=True)
                    member_growth = 0
                
                logger.info("Calculating project completion rate...")
                try:
                    completion_rate = self._calculate_project_completion_rate()
                    logger.info(f"Project completion rate: {completion_rate}%")
                except Exception as e:
                    logger.error(f"Error calculating completion rate: {str(e)}", exc_info=True)
                    completion_rate = 0
                
                # Basic metrics that are less likely to fail
                try:
                    from django.contrib.auth import get_user_model
                    from django.db.models import Count, Q
                    from datetime import datetime, timedelta
                    
                    User = get_user_model()
                    
                    # Get counts
                    total_orgs = orgs.count()
                    total_users = User.objects.count()
                    
                    # Count active users (logged in within last 30 days)
                    thirty_days_ago = datetime.now() - timedelta(days=30)
                    active_users = User.objects.filter(
                        last_login__gte=thirty_days_ago
                    ).count()
                    
                    # Get member growth (new users in last 30 days)
                    new_users = User.objects.filter(
                        date_joined__gte=thirty_days_ago
                    ).count()
                    
                    # Get organization memberships
                    org_memberships = User.objects.annotate(
                        org_count=Count('organizations', distinct=True)
                    ).filter(org_count__gt=0).count()
                    
                    metrics = {
                        'total_organizations': total_orgs,
                        'total_members': total_users,  # All users in the system
                        'active_members': active_users,  # Users active in last 30 days
                        'organization_members': org_memberships,  # Users with org memberships
                        'total_projects': Project.objects.count(),
                        'active_projects': active_projects,
                        'monthly_revenue': 0,  # This would come from payment data
                        'team_productivity': 75,  # Example value
                        'member_growth': new_users,  # New users in last 30 days
                        'project_completion_rate': completion_rate
                    }
                    logger.info(f"Successfully calculated all metrics: {metrics}")
                    
                except Exception as e:
                    logger.error(f"Error assembling metrics dictionary: {str(e)}", exc_info=True)
                    raise
                
            except Exception as metrics_error:
                logger.error(f"Critical error in metrics calculation: {str(metrics_error)}", exc_info=True)
                return Response(
                    {
                        'error': 'Failed to calculate dashboard metrics',
                        'debug': str(metrics_error)
                    }, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Format member activity data
            member_activity = self._get_member_activity(time_periods)
            
            # Get system health data
            system_health = self.get_system_health()
            
            # Get recent activities
            recent_activities = self.get_recent_activities()
            
            # Get projects and team members data if needed
            projects_data = []  # Populate this if needed
            team_members_data = []  # Populate this if needed
            deadlines_data = []  # Populate this if needed
            
            response_data = {
                'metrics': metrics,
                'recent_activities': recent_activities,
                'projects': projects_data,
                'team_members': team_members_data,
                'upcoming_deadlines': deadlines_data,
                'member_activity': member_activity,
                'project_status': self._get_project_status(),
                'system_health': system_health,
                'users': user_data,  # Include all users data
                'total_users': total_users,
                'last_updated': timezone.now().isoformat()
            }
            
            # Log the response size for debugging
            import json
            response_size = len(json.dumps(response_data))
            logger.info(f"Dashboard response size: {response_size} bytes")
            
            return Response(response_data)
            
        except Exception as e:
            import traceback
            print(f"Error in SuperAdminDashboardView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {'error': 'An error occurred while fetching dashboard data'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    def _calculate_project_completion_rate(self):
        """Calculate the percentage of completed projects."""
        total_projects = Project.objects.count()
        if total_projects == 0:
            return 0
            
        completed_projects = Project.objects.filter(status='completed').count()
        return round((completed_projects / total_projects) * 100, 1)
        
    def _get_member_activity(self, time_periods):
        """Get member activity data for the last 6 months."""
        six_months_ago = time_periods['now'] - timedelta(days=180)
        
        # Get new users per month for the last 6 months
        from django.db.models.functions import TruncMonth
        
        new_users = User.objects.filter(
            date_joined__gte=six_months_ago
        ).annotate(
            month=TruncMonth('date_joined')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('month')
        
        # Format for the frontend
        member_activity = []
        for item in new_users:
            member_activity.append({
                'month': item['month'].strftime('%Y-%m'),
                'active': 0,  # This would require tracking active users
                'new': item['count']
            })
            
        return member_activity
        
    def _get_project_status(self):
        """Get project status breakdown."""
        from django.db.models import Count
        
        status_counts = Project.objects.values('status').annotate(
            count=Count('id')
        )
        
        status_map = {
            'not_started': { 'name': 'Not Started', 'color': '#9CA3AF' },
            'in_progress': { 'name': 'In Progress', 'color': '#3B82F6' },
            'on_hold': { 'name': 'On Hold', 'color': '#F59E0B' },
            'completed': { 'name': 'Completed', 'color': '#10B981' },
            'cancelled': { 'name': 'Cancelled', 'color': '#EF4444' }
        }
        
        project_status = []
        for item in status_counts:
            status_info = status_map.get(item['status'], { 'name': item['status'].title(), 'color': '#6B7280' })
            project_status.append({
                'name': status_info['name'],
                'value': item['count'],
                'color': status_info['color']
            })
            
        return project_status
    
    def get_system_health(self):
        """Get system health metrics."""
        # TODO: Implement actual system health checks
        return {
            'status': 'healthy',
            'database': 'online',
            'storage': {
                'used_percent': 45,
                'status': 'ok'
            },
            'services': {
                'database': True,
                'cache': True,
                'background_worker': True
            }
        }
    
    def get_recent_activities(self, limit=10):
        """Get recent system activities."""
        activities = []
        logger = logging.getLogger(__name__)
        
        try:
            # Recent user signups
            logger.info("Fetching recent user signups...")
            recent_signups = User.objects.order_by('-date_joined')[:5]
            logger.info(f"Found {len(recent_signups)} recent signups")
            
            for user in recent_signups:
                try:
                    user_info = {
                        'id': str(user.id) if hasattr(user, 'id') else 'unknown',
                        'email': getattr(user, 'email', 'no-email'),
                        'name': (user.get_full_name() if callable(getattr(user, 'get_full_name', None)) 
                                else getattr(user, 'username', 'unknown'))
                    }
                    
                    activities.append({
                        'type': 'user_signup',
                        'user': user_info,
                        'timestamp': getattr(user, 'date_joined', timezone.now()).isoformat(),
                        'message': f"New user registered: {user_info['email']}"
                    })
                except Exception as user_error:
                    logger.error(f"Error processing user {getattr(user, 'id', 'unknown')}: {str(user_error)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error in get_recent_activities: {str(e)}", exc_info=True)
            # Return a default activity if there's an error
            activities = [{
                'type': 'system',
                'timestamp': timezone.now().isoformat(),
                'message': 'Error loading recent activities'
            }]
        
        # Sort by timestamp and return limited results
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return activities[:limit]


class OrganizationAdminDashboardView(BaseDashboardView):
    """Dashboard view for organization administrators."""
    permission_classes = [IsOrganizationAdmin]
    
    def get(self, request, format=None):
        context = self.get_common_context(request)
        organization = context.get('current_organization')
        
        if not organization:
            return Response(
                {'error': 'User is not a member of any organization'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        time_periods = context['time_periods']
        
        # Member statistics
        members = OrganizationMember.objects.filter(organization=organization)
        member_stats = {
            'total': members.count(),
            'by_role': list(members.values('role').annotate(count=Count('id')))
        }
        
        # Project statistics - filter projects through the client relationship
        projects = Project.objects.filter(client__organization=organization)
        project_stats = {
            'total': projects.count(),
            'active': projects.filter(status='in_progress').count(),
            'completed': projects.filter(status='completed').count(),
            'overdue': projects.filter(deadline__lt=time_periods['today'], status='in_progress').count()
        }
        
        # Recent activities
        recent_activities = self.get_recent_activities(organization)
        
        return Response({
            'organization': {
                'id': str(organization.id),
                'name': organization.name,
                'created_at': organization.created_at.isoformat()
            },
            'member_stats': member_stats,
            'project_stats': project_stats,
            'recent_activities': recent_activities,
            'timestamp': time_periods['now'].isoformat()
        })
    
    def get_recent_activities(self, organization, limit=10):
        """Get recent activities for the organization."""
        activities = []
        
        # Recent project updates - filter through client relationship
        recent_projects = Project.objects.filter(
            client__organization=organization
        ).order_by('-updated_at')[:5]
        
        for project in recent_projects:
            activities.append({
                'type': 'project_update',
                'project': {
                    'id': str(project.id),
                    'name': project.name,
                    'status': project.status
                },
                'timestamp': project.updated_at.isoformat(),
                'message': f"Project '{project.name}' was updated"
            })
        
        # Sort by timestamp and return limited results
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return activities[:limit]
