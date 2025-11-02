from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

class BaseDashboardView(APIView):
    """Base view for all dashboard views with common functionality."""
    permission_classes = [IsAuthenticated]
    
    def get_dashboard_url(self, role):
        """Get the dashboard URL based on user role."""
        role_dashboards = {
            'superadmin': '/api/v1/dashboard/superadmin/overview/',
            'admin': '/api/v1/dashboard/admin/overview/',
            'project_manager': '/api/v1/dashboard/manager/overview/',
            'developer': '/api/v1/dashboard/developer/overview/',
            'salesperson': '/api/v1/dashboard/sales/overview/',
            'support': '/api/v1/dashboard/support/overview/',
            'verifier': '/api/v1/dashboard/verifier/overview/',
        }
        return role_dashboards.get(role.lower(), '/api/v1/dashboard/unauthorized/')
    
    def get(self, request, *args, **kwargs):
        """Handle GET request and redirect to the appropriate dashboard based on user role.
        
        Args:
            request: The HTTP request object
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
            
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
