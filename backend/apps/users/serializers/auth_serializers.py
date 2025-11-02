from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.organization.models import OrganizationMember

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['name'] = user.get_full_name() or user.email
        token['email'] = user.email
        
        # Add organization role
        try:
            org_membership = OrganizationMember.objects.filter(
                user=user,
                is_active=True
            ).select_related('organization').first()
            
            if org_membership:
                token['organization_role'] = org_membership.role
                token['organization_id'] = str(org_membership.organization.id)
                token['organization_name'] = org_membership.organization.name
        except Exception as e:
            # Log the error but don't fail the login
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting organization membership for user {user.id}: {str(e)}")
            
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)
        
        # Get organization membership
        org_membership = OrganizationMember.objects.filter(
            user=self.user,
            is_active=True
        ).select_related('organization').first()
        
        # Add user data to the response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'name': self.user.get_full_name() or self.user.email,
            'role': self.user.role,
        }
        
        # Add organization data if available
        if org_membership:
            data['user']['organization_role'] = org_membership.role
            data['user']['organization'] = {
                'id': str(org_membership.organization.id),
                'name': org_membership.organization.name
            }
        
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
