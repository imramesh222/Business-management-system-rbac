from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class BaseRoleDashboard(APIView):
    """Base dashboard view for all roles."""
    permission_classes = [IsAuthenticated]
    role_name = None
    
    def get(self, request, *args, **kwargs):
        """Return basic dashboard data for the role."""
        return Response({
            'status': 'success',
            'role': self.role_name,
            'message': f'Welcome to the {self.role_name} dashboard',
            'data': {
                'user': {
                    'id': request.user.id,
                    'email': request.user.email,
                    'role': request.user.role,
                },
                # Add more role-specific data here
            }
        }, status=status.HTTP_200_OK)

class ProjectManagerDashboardView(BaseRoleDashboard):
    """Dashboard view for Project Managers."""
    role_name = 'project_manager'

class DeveloperDashboardView(BaseRoleDashboard):
    """Dashboard view for Developers."""
    role_name = 'developer'

class SalesDashboardView(BaseRoleDashboard):
    """Dashboard view for Sales team."""
    role_name = 'salesperson'

class SupportDashboardView(BaseRoleDashboard):
    """Dashboard view for Support team."""
    role_name = 'support'

class VerifierDashboardView(BaseRoleDashboard):
    """Dashboard view for Verifiers."""
    role_name = 'verifier'

class UserDashboardView(BaseRoleDashboard):
    """Dashboard view for regular Users."""
    role_name = 'user'
