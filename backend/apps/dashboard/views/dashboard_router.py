from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

class DashboardRouterView(APIView):
    """View to route users to their respective dashboards based on role."""
    permission_classes = [IsAuthenticated]
    
    def get_dashboard_url(self, role):
        """Get the dashboard URL based on user role."""
        role_dashboards = {
            'superadmin': '/superadmin',
            'admin': '/organization/dashboard',
            'project_manager': '/organization/project-manager/dashboard',
            'manager': '/organization/project-manager/dashboard',  # Alias for project_manager
            'developer': '/organization/developer/dashboard',
            'salesperson': '/organization/sales/dashboard',
            'sales': '/organization/sales/dashboard',  # Alias for salesperson
            'support': '/organization/support/dashboard',
            'verifier': '/organization/verifier/dashboard',
            'user': '/organization/user/dashboard',
        }
        return role_dashboards.get(role.lower(), '/api/v1/dashboard/unauthorized/')
    
    def get(self, request, *args, **kwargs):
        """Handle GET request and redirect to the appropriate dashboard based on user role.
        
        Returns:
            Response: JSON response with redirect URL and user role
        """
        user = request.user
        if not user.is_authenticated:
            return Response(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        # Get the dashboard URL based on user role
        dashboard_url = self.get_dashboard_url(user.role)
        
        # Return the URL to redirect to
        return Response({
            'redirect_url': dashboard_url,
            'role': user.role,
            'message': f'Redirecting to {user.role} dashboard'
        }, status=status.HTTP_200_OK)
