"""URL configuration for the organization app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    OrganizationViewSet,
    DashboardViewSet,
    OrganizationAdminDashboardView,
    debug_organization_view
)
from .views.member_views import OrganizationMemberViewSet, user_organization_memberships
from .views.registration_views import OrganizationRegistrationView
from .views.subscription_views import (
    SubscriptionPlanViewSet,
    PlanDurationViewSet,
    OrganizationSubscriptionViewSet
)

# Define the application namespace
app_name = 'organization'

# Initialize router for ViewSets
router = DefaultRouter()

# Register ViewSets with router
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'organization-members', OrganizationMemberViewSet, basename='organization-member')

# Subscription endpoints
router.register(r'subscription/plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'subscription/durations', PlanDurationViewSet, basename='plan-duration')
router.register(r'subscription/subscriptions', OrganizationSubscriptionViewSet, basename='organization-subscription')

# URL patterns
urlpatterns = [
    # Include router URLs - this will create the standard REST endpoints
    path('', include(router.urls)),
    
    # User memberships endpoint
    path('users/<uuid:user_id>/organization-memberships/', 
         user_organization_memberships, 
         name='user-organization-memberships'),
    
    # Organization registration
    path('register/', OrganizationRegistrationView.as_view(), name='organization-register'),
    
    # Member management - specific actions
    path('organizations/invite/', 
         OrganizationMemberViewSet.as_view({'post': 'invite_member'}), 
         name='invite-member'),
    
    # Member count endpoint
    path('organizations/<uuid:pk>/member-count/', 
         OrganizationMemberViewSet.as_view({'get': 'member_count'}),
         name='organization-member-count'),
    
    # Debug endpoint
    path('organizations/debug/<uuid:pk>/', debug_organization_view, name='debug-organization'),
    
    # Dashboard endpoints
    path('dashboard/metrics/', DashboardViewSet.as_view(), name='dashboard-metrics'),
    path('dashboard/admin/overview/', OrganizationAdminDashboardView.as_view(), name='organization-admin-dashboard'),
         
    # Developer-specific endpoints
    path('developers/',
         OrganizationMemberViewSet.as_view({'get': 'developers'}),
         name='organization-developers'),
]

# The router will automatically create these endpoints:
# GET /org/organizations/ - List organizations
# POST /org/organizations/ - Create organization
# GET /org/organizations/{id}/ - Get organization detail
# PUT /org/organizations/{id}/ - Update organization
# DELETE /org/organizations/{id}/ - Delete organization

# GET /org/organization-members/ - List all organization members
# POST /org/organization-members/ - Create organization member
# GET /org/organization-members/{id}/ - Get organization member detail
# PUT /org/organization-members/{id}/ - Update organization member
# DELETE /org/organization-members/{id}/ - Delete organization member