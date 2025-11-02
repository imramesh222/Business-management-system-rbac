# Export all dashboard views
from .dashboard_router import DashboardRouterView
from .role_dashboards import (
    ProjectManagerDashboardView,
    DeveloperDashboardView,
    SalesDashboardView,
    SupportDashboardView,
    VerifierDashboardView,
    UserDashboardView,
)
from .system_views import SystemHealthView, ActivitiesView

__all__ = [
    'DashboardRouterView',
    'ProjectManagerDashboardView',
    'DeveloperDashboardView',
    'SalesDashboardView',
    'SupportDashboardView',
    'VerifierDashboardView',
    'UserDashboardView',
    'SystemHealthView',
    'ActivitiesView'
]
