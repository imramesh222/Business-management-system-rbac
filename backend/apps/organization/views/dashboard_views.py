from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, permission_classes
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDay, TruncMonth
from apps.organization.models import Organization, OrganizationMember, OrganizationSubscription, PlanDuration
from apps.users.models import User

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
        # Example organization admin metrics - replace with actual data from your models
        data = {
            'organization': {
                'id': 1,
                'name': 'Example Organization',
                'members_count': 0,
                'projects_count': 0,
                'active_projects_count': 0,
                'storage_usage': 0,
                'storage_limit': 0,
                'subscription_plan': 'Free',
                'subscription_status': 'active',
                'billing_status': 'paid',
                'recent_activities': [],
                'upcoming_events': [],
                'team_performance': {
                    'completed_tasks': 0,
                    'pending_tasks': 0,
                    'completion_rate': 0,
                },
                'resource_usage': {
                    'storage': 0,
                    'bandwidth': 0,
                    'api_calls': 0,
                },
                'billing': {
                    'current_plan': 'Free',
                    'next_billing_date': None,
                    'amount_due': 0,
                    'payment_method': 'None',
                }
            },
            'timestamp': timezone.now().isoformat()
        }
        
        return Response(data)