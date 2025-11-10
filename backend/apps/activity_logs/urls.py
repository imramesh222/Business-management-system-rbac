from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .export_views import ExportActivityLogsView

router = DefaultRouter()
router.register(r'', views.ActivityLogViewSet, basename='activity-log')

app_name = 'activity_logs'

urlpatterns = [
    path('', include(router.urls)),
    # Export endpoints
    path('export/', ExportActivityLogsView.as_view(), name='activity-log-export'),
    path('export', ExportActivityLogsView.as_view(), name='activity-log-export-no-slash'),
]
