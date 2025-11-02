from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

class SystemHealthView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get system health status."""
        return Response({
            'status': 'operational',
            'version': '1.0.0',
            'timestamp': timezone.now().isoformat(),
        })

class ActivitiesView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get recent activities."""
        # TODO: Implement activity fetching logic
        return Response({
            'activities': [],
            'count': 0
        })
