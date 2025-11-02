from django.urls import path
from .base_views import (
    SuperAdminDashboardView,
    OrganizationAdminDashboardView,
)
from .views import (
    DashboardRouterView,
    ProjectManagerDashboardView,
    DeveloperDashboardView,
    SalesDashboardView,
    SupportDashboardView,
    VerifierDashboardView,
    UserDashboardView,
    SystemHealthView,
    ActivitiesView
)

app_name = 'dashboard'

# Role-based dashboard endpoints
urlpatterns = [
    # Main dashboard router - redirects to appropriate dashboard based on user role
    path('', DashboardRouterView.as_view(), name='dashboard-router'),
    
    # Role-based dashboards
    path('superadmin/overview/', SuperAdminDashboardView.as_view(), name='superadmin-overview'),
    path('admin/overview/', OrganizationAdminDashboardView.as_view(), name='admin-overview'),
    path('manager/overview/', ProjectManagerDashboardView.as_view(), name='manager-overview'),
    path('developer/overview/', DeveloperDashboardView.as_view(), name='developer-overview'),
    path('sales/overview/', SalesDashboardView.as_view(), name='sales-overview'),
    path('support/overview/', SupportDashboardView.as_view(), name='support-overview'),
    path('verifier/overview/', VerifierDashboardView.as_view(), name='verifier-overview'),
    path('user/overview/', UserDashboardView.as_view(), name='user-overview'),
    
    # System endpoints
    path('system/health/', SystemHealthView.as_view(), name='system-health'),
    path('activities/', ActivitiesView.as_view(), name='activities'),
]
