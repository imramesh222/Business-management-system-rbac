import logging
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.organization.models import OrganizationMember, OrganizationRoleChoices

# Set up logging
logger = logging.getLogger(__name__)
User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(self, user):
        logger.info(f"[JWT Token] Getting token for user: {user.email}")
        token = super().get_token(user)
        
        # Initialize default values
        role = 'user'
        org_membership = None
        
        try:
            logger.info(f"[JWT Token] Looking up organization memberships for user: {user.email}")
            
            # Get all active organization memberships ordered by role (highest first)
            # We use -role to get the highest role first (assuming role is ordered by permissions)
            org_memberships = OrganizationMember.objects.filter(
                user=user,
                is_active=True
            ).select_related('organization').order_by('-role').all()
            
            logger.info(f"[JWT Token] Found {org_memberships.count()} active organization memberships")
            
            # Debug: Log all memberships
            for idx, m in enumerate(org_memberships, 1):
                logger.info(f"[JWT Token] Membership {idx}: ID={m.id}, Role={m.role}, Org={m.organization.name if m.organization else 'None'}, Active={m.is_active}")
            
            # Get the first active organization membership with the highest role
            if org_memberships.exists():
                # Get the membership with the highest role (first one due to ordering)
                org_membership = org_memberships.first()
                logger.info(f"[JWT Token] Using organization membership: {org_membership.id}")
                logger.info(f"[JWT Token] Role from DB: {getattr(org_membership, 'role', 'No role')}, Organization: {org_membership.organization.name}")
                
                # Get the role value from the membership
                role_value = getattr(org_membership, 'role', None)
                logger.info(f"[JWT Token] Raw role value: {role_value}, Type: {type(role_value).__name__}")
                
                # Convert role to string and ensure it's a valid role
                role = str(role_value).lower() if role_value is not None else 'user'
                
                # Ensure the role is one of the valid choices
                valid_roles = [choice[0] for choice in OrganizationRoleChoices.choices]
                if role not in valid_roles:
                    logger.warning(f"[JWT Token] Invalid role '{role}' found, defaulting to 'user'")
                    role = 'user'
                
                logger.info(f"[JWT Token] Processed role: {role}")
                
                # Set organization data in token
                token['organization_id'] = str(org_membership.organization.id)
                token['organization_name'] = org_membership.organization.name
                token['is_staff'] = getattr(org_membership, 'is_staff', False) or False
                token['is_superuser'] = user.is_superuser
                
                # Set both role and organization_role in the token
                token['role'] = role
                token['organization_role'] = role
                
                # Add a debug claim to verify the role was set
                token['_debug_role'] = role
                
                # Log the final assignment
                logger.info(f"[JWT Token] Final role assignment - role: {role}, org_role: {role}")
                
                # Add debug logging for token claims
                logger.info(f"[JWT Token] Token claims being set: {token.payload}")
                
                # Debug log the token data structure
                logger.info(f"[JWT Token] Token data after role assignment: {token}")
                
                # Debug: Log the final token data
                logger.info(f"[JWT Token] Final token data - role: {role}, org_id: {token['organization_id']}, org_name: {token['organization_name']}")
            else:
                logger.warning(f"[JWT Token] No active organization memberships found for user {user.email}")
                token['role'] = role  # Use default 'user' role
                token['is_staff'] = user.is_staff
                token['is_superuser'] = user.is_superuser
            
            # Always set these basic claims
            token['name'] = user.get_full_name() or user.email
            token['email'] = user.email
            token['user_id'] = str(user.id)
            
            logger.info(f"[JWT Token] Final token claims - Role: {token['role']}, Is Staff: {token['is_staff']}, Is Superuser: {token['is_superuser']}, Org: {token.get('organization_name', 'None')}")
            
        except Exception as e:
            logger.error(f"[JWT Token] Error processing organization membership for user {user.id}: {str(e)}", exc_info=True)
            # Fall back to basic user role if there's an error
            token['role'] = 'user'
            token['is_staff'] = user.is_staff
            token['is_superuser'] = user.is_superuser
            token['name'] = user.get_full_name() or user.email
            token['email'] = user.email
            token['user_id'] = str(user.id)
        
        return token

    def validate(self, attrs):
        # First, validate the credentials
        logger.info(f"[Login] Starting login validation for user: {attrs.get('email', 'unknown')}")
        
        # Make sure we have either username or email
        if 'username' not in attrs and 'email' in attrs:
            attrs['username'] = attrs['email']
            
        # Standard validation
        data = super().validate(attrs)
        
        # Get the user from the validated data
        user = self.user
        
        # Generate new tokens with the updated claims
        refresh = self.get_token(user)
        
        # Get the role from the token (which was set in get_token)
        role = refresh.get('role', 'user')
        organization_id = refresh.get('organization_id')
        organization_name = refresh.get('organization_name', '')
        organization_role = refresh.get('organization_role', role)  # Fallback to role if not set
        
        # Log the token claims for debugging
        logger.info(f"[Login] Token claims - role: {role}, org_role: {organization_role}, org_id: {organization_id}, org_name: {organization_name}")
        
        # Get additional user attributes from the token
        is_staff = refresh.get('is_staff', False)
        is_superuser = refresh.get('is_superuser', False)
        
        # Update the response data with the new tokens and user info
        data.update({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': organization_role,  # Use organization_role as the primary role
            'organization_role': organization_role,
            'organization_id': organization_id,
            'organization_name': organization_name,
            'is_staff': is_staff,
            'is_superuser': is_superuser,
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'is_staff': is_staff,
                'is_superuser': is_superuser,
                'role': organization_role,  # Use organization_role here
                'organization_role': organization_role,
                'organization_id': organization_id,
                'organization_name': organization_name
            }
        })
        
        logger.info(f"[Login] Login successful for user {user.email} with role: {role}")
        
        return data

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        return value.lower()

class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data
    
    def validate_uid(self, value):
        try:
            # Decode the uid to ensure it's valid
            uid = force_str(urlsafe_base64_decode(value))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError("Invalid reset link.")
        return value
    
    def validate_token(self, value):
        try:
            uid = force_str(urlsafe_base64_decode(self.initial_data.get('uid', '')))
            user = User.objects.get(pk=uid, is_active=True)
            if not default_token_generator.check_token(user, value):
                raise serializers.ValidationError("Invalid or expired reset link.")
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            # The error will be caught by validate_uid
            pass
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    
    def validate_uid(self, value):
        try:
            # Decode the uid to ensure it's valid
            uid = force_str(urlsafe_base64_decode(value))
            user = User.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError("Invalid reset link.")
        return value
    
    def validate_token(self, value):
        try:
            uid = force_str(urlsafe_base64_decode(self.initial_data.get('uid', '')))
            user = User.objects.get(pk=uid, is_active=True)
            if not default_token_generator.check_token(user, value):
                raise serializers.ValidationError("Invalid or expired reset link.")
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            # The error will be caught by validate_uid
            pass
        return value
