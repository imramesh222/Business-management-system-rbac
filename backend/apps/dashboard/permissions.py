from rest_framework import permissions
from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model

User = get_user_model()

class IsSuperAdmin(BasePermission):
    """Allows access only to super admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)

class IsOrganizationAdmin(BasePermission):
    """Allows access to organization admins and other roles with dashboard access."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Allow access to all roles that have dashboard access
        return request.user.role in [
            'superadmin', 'admin', 'project_manager', 'developer', 
            'salesperson', 'support', 'verifier', 'user'
        ]

class IsProjectManager(BasePermission):
    """Allows access to project managers."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'project_manager'

class IsDeveloper(BasePermission):
    """Allows access to developers."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'developer'

class IsSalesperson(BasePermission):
    """Allows access to sales team members."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'salesperson'

class IsSupportStaff(BasePermission):
    """Allows access to support staff."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'support'

class IsVerifier(BasePermission):
    """Allows access to verifiers."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'verifier'

class HasOrganizationAccess(permissions.BasePermission):
    """
    Permission class to check if user has access to the organization.
    """
    def has_object_permission(self, request, view, obj):
        # Super admins can access any organization
        if request.user.is_superuser:
            return True
            
        # Organization admins can access their own organization
        if hasattr(obj, 'organization'):
            return obj.organization in request.user.organizations.all()
            
        # For organization objects themselves
        if hasattr(obj, 'members'):
            return obj.members.filter(id=request.user.id).exists()
            
        return False
