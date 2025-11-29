from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet

app_name = 'projects'

# Create a router for ViewSets
router = DefaultRouter()
# Register the viewset with an empty prefix since it's already included under /api/v1/projects/
router.register(r'', ProjectViewSet, basename='project')

urlpatterns = [
    # Include all ViewSet URLs
    path('', include(router.urls)),
    
    # Project verification endpoint
    path('<uuid:pk>/verify/', 
         ProjectViewSet.as_view({'post': 'verify'}), 
         name='project-verify'),
]