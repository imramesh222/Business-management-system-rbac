import random
import string
import logging
from django.shortcuts import get_object_or_404, render
from django.http import Http404
from django.template.loader import render_to_string
from django.template.exceptions import TemplateDoesNotExist
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Count
from rest_framework import status, viewsets, permissions, mixins, serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.conf import settings

# Try to import token blacklist models
try:
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
except ImportError:
    BlacklistedToken = None
    OutstandingToken = None

# Set up logging
logger = logging.getLogger(__name__)
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string

from apps.organization.models import Organization, OrganizationMember, OrganizationRoleChoices
from apps.organization.serializers import (
    OrganizationMemberSerializer,
    OrganizationMemberCreateSerializer,
    OrganizationMemberUpdateSerializer,
    DeveloperSerializer
)
from apps.users.permissions import IsSuperAdmin, IsOrganizationAdmin

def generate_random_password(length=12):
    """Generate a random password."""
    chars = string.ascii_letters + string.digits + '!@#$%^&*()'
    return ''.join(random.choice(chars) for _ in range(length))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_organization_memberships(request, user_id):
    """Get all organization memberships for a specific user"""
    try:
        print(f"[USER_MEMBERSHIPS] Getting memberships for user: {user_id}")
        
        # Ensure user can only access their own memberships or admin can access any
        if str(request.user.id) != str(user_id) and not request.user.is_superuser:
            # Check if user is admin of any organization where the target user is a member
            admin_orgs = OrganizationMember.objects.filter(
                user=request.user,
                role__in=['admin'],
                is_active=True
            ).values_list('organization_id', flat=True)
            
            target_user_orgs = OrganizationMember.objects.filter(
                user_id=user_id,
                organization_id__in=admin_orgs,
                is_active=True
            ).exists()
            
            if not target_user_orgs:
                return Response(
                    {'error': 'You do not have permission to view this user\'s memberships'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        memberships = OrganizationMember.objects.filter(
            user_id=user_id,
            is_active=True
        ).select_related('organization', 'user')
        
        # Return the membership data
        data = []
        for membership in memberships:
            data.append({
                'id': str(membership.id),
                'organization': {
                    'id': str(membership.organization.id),
                    'name': membership.organization.name,
                    'slug': membership.organization.slug,
                },
                'role': membership.role,
                'is_active': membership.is_active,
                'created_at': membership.created_at.isoformat(),
                'updated_at': membership.updated_at.isoformat(),
            })
        
        print(f"[USER_MEMBERSHIPS] Found {len(data)} memberships")
        return Response(data)
        
    except Exception as e:
        print(f"[USER_MEMBERSHIPS] Error: {str(e)}")
        return Response(
            {'error': 'Failed to fetch user memberships', 'details': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class OrganizationMemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing organization members.
    """
    queryset = OrganizationMember.objects.select_related('user', 'organization').all()
    serializer_class = OrganizationMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['organization', 'role', 'is_active']
    search_fields = [
        'user__username', 'user__email', 
        'user__first_name', 'user__last_name',
        'organization__name'
    ]
    
    @action(detail=True, methods=['get'], url_path='count')
    def member_count(self, request, pk=None):
        """
        Get the total count of active members in the organization.
        """
        from django.shortcuts import get_object_or_404
        from rest_framework.exceptions import NotFound
        
        try:
            # Get the organization using the pk from the URL
            organization = get_object_or_404(Organization, id=pk)
            
            # Count active members in the organization
            count = OrganizationMember.objects.filter(
                organization=organization,
                is_active=True
            ).count()
            
            return Response({
                'organization_id': str(organization.id),
                'organization_name': organization.name,
                'member_count': count
            })
            
        except (ValueError, Organization.DoesNotExist):
            raise NotFound("Organization not found")

    @action(detail=True, methods=['post'], url_path='invite', 
            permission_classes=[IsSuperAdmin | IsOrganizationAdmin])
    def invite_member(self, request, pk=None):
        """
        Invite a new member to the organization by email.
        Generates a random password and sends an invitation email.
        """
        print("\n=== Invite Member Request ===")
        print(f"Method: {request.method}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Request data type: {type(request.data)}")
        print(f"Request data: {request.data}")
        print(f"Request user: {request.user}")
        print(f"Authenticated: {request.user.is_authenticated}")
        print(f"Organization ID from URL: {pk}")
        
        try:
            # Get organization from URL parameter
            organization = get_object_or_404(Organization, id=pk)
            
            # Extract data from request
            data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
            print(f"\nParsed data: {data}")
            
            email = data.get('email')
            role = data.get('role', 'user')
            
            print(f"Email from request: {email}")
            print(f"Role from request: {role}")
            print(f"Organization: {organization.name} (ID: {organization.id})")
            
            # Normalize role to snake_case
            if role:
                role = str(role).replace('-', '_').lower()
            else:
                role = 'user'
                
            print(f"Normalized role: {role}")
            
            # Validate role
            valid_roles = dict(OrganizationRoleChoices.choices).keys()
            print(f"Valid roles: {list(valid_roles)}")
            
            if not role:
                print("Role is required")
                return Response(
                    {'error': 'Role is required', 'valid_roles': list(valid_roles)},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if role not in valid_roles:
                print(f"Invalid role: {role}. Must be one of: {list(valid_roles)}")
                return Response(
                    {
                        'error': 'Invalid role',
                        'details': f'"{role}" is not a valid role',
                        'valid_roles': list(valid_roles),
                        'received_role': role,
                        'normalized_role': role.lower().replace('-', '_')
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            if not email:
                return Response(
                    {'error': 'Email is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            print(f"Error processing request: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Invalid request data', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the organization from the requesting user
        try:
            print(f"\nGetting organization for user: {request.user.id} - {request.user.email}")
            current_member = OrganizationMember.objects.filter(
                user=request.user,
                is_active=True
            ).select_related('organization').first()
            
            if not current_member or not hasattr(current_member, 'organization'):
                print("No active organization membership found for user")
                return Response(
                    {'error': 'You are not a member of any organization'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            organization = current_member.organization
            print(f"Found organization: {organization.id} - {organization.name}")
            
            # Additional permission check - ensure user is admin of this organization
            if current_member.role not in ['admin', 'super_admin'] and not request.user.is_superuser:
                print(f"User {request.user.email} does not have admin permissions. Current role: {current_member.role}")
                return Response(
                    {'error': 'You do not have permission to invite members to this organization'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
        except Exception as e:
            print(f"Error getting organization: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Error processing your organization membership'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        # Check if user already exists
        User = get_user_model()
        try:
            user = User.objects.filter(email=email).first()
            if user:
                print(f"User with email {email} already exists: {user.id}")
                # Check if user is already a member of this organization
                if OrganizationMember.objects.filter(user=user, organization=organization).exists():
                    return Response(
                        {"error": "User is already a member of this organization"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Add existing user to organization
                member = OrganizationMember.objects.create(
                    user=user,
                    organization=organization,
                    role=role,
                    is_active=True
                )
                print(f"Added existing user to organization: {member.id}")
                
                # Generate token and UID for password reset
                from django.utils.http import urlsafe_base64_encode
                from django.utils.encoding import force_bytes
                from django.contrib.auth.tokens import default_token_generator
                
                # Generate token and UID for password reset
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                # Using query parameters for better SPA compatibility
                # Match the frontend's expected reset password URL
                reset_url = f"{settings.FRONTEND_URL}/reset-password/?uid={uid}&token={token}"
                
                # Send organization invitation email with password reset link
                try:
                    subject = f'You\'ve been added to {organization.name} on ProjectK'
                    # Prepare email context with all required variables
                    email_context = {
                        'user': user,
                        'organization': organization,
                        'role': role,
                        'login_url': f'{settings.FRONTEND_URL}/login',
                        'reset_url': reset_url,
                    }
                    
                    # Render the email template
                    message = render_to_string('emails/organization_invitation.html', email_context)
                    
                    send_mail(
                        subject=subject,
                        message=f"You've been added to {organization.name}. Please use this link to set your password: {reset_url}",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        html_message=message,
                        fail_silently=False,
                    )
                    print(f"Invitation email with password reset sent to {email}")
                except Exception as e:
                    print(f"Warning: Failed to send invitation email: {str(e)}")
                    # Don't fail the whole process if email fails
                    pass
                
                return Response(
                    {"message": "User added to organization"},
                    status=status.HTTP_201_CREATED
                )
            
            # Generate a random password for new users
            password = User.objects.make_random_password(length=12)
            username = email.split('@')[0]
            
            # Create user with a flag to change password on first login
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True
            )
            
            # Create user profile if it doesn't exist
            from apps.users.models import UserProfile
            profile, created = UserProfile.objects.get_or_create(user=user)
            
            # Generate OTP for the user
            otp = profile.generate_otp()
            
            # Log the OTP for development (remove in production)
            print(f"Generated OTP for {email}: {otp}")
            print(f"Generated password for {email}: {password}")
            
            # Set password change required flag
            profile.password_change_required = True
            profile.save()
            print(f"Successfully created user: {user.id} - {user.email}")
            
            # Add user to organization
            member = OrganizationMember.objects.create(
                user=user,
                organization=organization,
                role=role,
                is_active=True
            )
            
            # Send welcome email with credentials
            try:
                subject = f'Welcome to {organization.name} on ProjectK'
                
                # Create a plain text version of the email
                text_content = f"""
                Welcome to {organization.name} on ProjectK!
                
                Your account has been created with the following details:
                Email: {email}
                Password: {password}
                OTP: {otp}
                
                Please log in at: {settings.FRONTEND_URL}/login
                
                You will be prompted to change your password on first login.
                """
                
                # Try to render HTML template, fallback to text if template doesn't exist
                try:
                    html_content = render_to_string('emails/welcome_invitation.html', {
                        'user': user,
                        'organization': organization,
                        'email': email,
                        'otp': otp,
                        'password': password,
                        'login_url': f'{settings.FRONTEND_URL}/login',
                    })
                except TemplateDoesNotExist:
                    html_content = None
                
                # Send the email
                email_message = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email],
                    reply_to=[settings.REPLY_TO_EMAIL],
                )
                
                if html_content:
                    email_message.attach_alternative(html_content, 'text/html')
                
                email_message.send(fail_silently=False)
                print(f"Welcome email sent to {email}")
                
            except Exception as email_error:
                error_msg = f"Failed to send welcome email to {email}: {str(email_error)}"
                print(f"ERROR: {error_msg}")
                # Log the full error for debugging
                import traceback
                traceback.print_exc()
                
                # Return the error in the response but don't fail the user creation
                return Response(
                    {
                        "message": "User created but failed to send welcome email",
                        "error": str(email_error),
                        "user_id": str(user.id),
                        "email": email,
                        "password": password,  # Include password in response since email failed
                        "otp": otp,  # Include OTP in response since email failed
                        "organization": organization.name,
                        "role": role
                    },
                    status=status.HTTP_201_CREATED
                )
            
        except Exception as e:
            print(f"Unexpected error in user lookup/creation: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {
                    'error': 'Unexpected error processing user',
                    'details': str(e),
                    'type': type(e).__name__
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(
            {
                'message': 'Member invited successfully',
                'user_id': user.id,
                'member_id': member.id,
                'organization': organization.name
            }, 
            status=status.HTTP_201_CREATED
        )
        
    def get_object(self):
        """
        Override to handle both 'pk' and 'member_id' URL parameters.
        """
        # Check if we're using the nested URL pattern with member_id
        member_id = self.kwargs.get('member_id')
        if member_id:
            self.kwargs['pk'] = member_id
            
        # Get the organization_id from URL kwargs if present
        organization_id = self.kwargs.get('organization_id')
        if organization_id:
            # Filter the queryset to only include members of this organization
            queryset = self.get_queryset().filter(organization_id=organization_id)
            
            # Get the member by pk from the filtered queryset
            try:
                obj = queryset.get(pk=self.kwargs['pk'])
                # Check object permissions
                self.check_object_permissions(self.request, obj)
                return obj
            except OrganizationMember.DoesNotExist:
                raise Http404("No OrganizationMember matches the given query.")
        
        # Fall back to default behavior if no organization_id in URL
        return super().get_object()
        
    def get_queryset(self):
        """
        Filter the queryset based on organization_id from URL kwargs if present.
        """
        queryset = super().get_queryset()
        
        # Check for organization_id in URL kwargs (for nested routes)
        organization_id = self.kwargs.get('organization_id')
        if organization_id:
            logger.info(f"Filtering members by organization_id from URL: {organization_id}")
            queryset = queryset.filter(organization_id=organization_id)
        
        # Check for organization_id in query params (for backward compatibility)
        organization_id_param = self.request.query_params.get('organization')
        if organization_id_param and not organization_id:
            logger.info(f"Filtering members by organization_id from query params: {organization_id_param}")
            queryset = queryset.filter(organization_id=organization_id_param)
            
        # Apply search if specified
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(organization__name__icontains=search)
            )
            
        return queryset.distinct()

    def get_organization(self):
        """
        Get the organization from the request.
        This is used by the permission classes to check permissions.
        """
        if hasattr(self, 'organization'):
            return self.organization
            
        organization_id = None
        
        # Try to get organization_id from URL kwargs
        if 'organization_id' in self.kwargs:
            organization_id = self.kwargs['organization_id']
        elif 'pk' in self.kwargs and self.action == 'invite_member':
            organization_id = self.kwargs['pk']
        elif hasattr(self, 'request') and self.request.method == 'POST':
            # For create operations, get organization_id from request data
            organization_id = self.request.data.get('organization')
            
        if not organization_id:
            return None
            
        try:
            self.organization = Organization.objects.get(id=organization_id)
            return self.organization
        except (Organization.DoesNotExist, ValueError):
            return None

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'invite_member']:
            permission_classes = [IsSuperAdmin | IsOrganizationAdmin]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return OrganizationMemberCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return OrganizationMemberUpdateSerializer
        return OrganizationMemberSerializer
        
    @action(detail=False, methods=['get'])
    def developers(self, request):
        """
        Get all developers across all organizations.
        """
        developers = self.get_queryset().filter(
            role=OrganizationRoleChoices.DEVELOPER,
            is_active=True
        )
        serializer = DeveloperSerializer(developers, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        organization_id = self.request.data.get('organization')
        organization = get_object_or_404(Organization, id=organization_id)
        
        # Check if user is already a member of this organization
        user_id = self.request.data.get('user')
        if OrganizationMember.objects.filter(
            user_id=user_id, 
            organization=organization
        ).exists():
            raise serializers.ValidationError({
                'user': 'This user is already a member of this organization.'
            })
            
        serializer.save(organization=organization)
        
    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            old_role = instance.role
            # Only allow updating specific fields
            data = {key: request.data.get(key) for key in ['role', 'is_active'] if key in request.data}
            serializer = self.get_serializer(instance, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            # Only try to invalidate tokens if role changed and token blacklist is available
            if 'role' in request.data and request.data['role'] != old_role and OutstandingToken is not None:
                from django.utils import timezone
                
                try:
                    # Get all outstanding tokens for this user
                    tokens = OutstandingToken.objects.filter(
                        user_id=instance.user_id,
                        expires_at__gt=timezone.now()
                    )
                    
                    # Blacklist all tokens for this user
                    for token in tokens:
                        BlacklistedToken.objects.get_or_create(token=token)
                        
                    logger.info(f"Invalidated all tokens for user {instance.user.email} due to role change from {old_role} to {request.data['role']}")
                except Exception as e:
                    logger.warning(f"Could not invalidate tokens for user {instance.user.email}: {str(e)}")
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error updating organization member: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate an organization member."""
        member = self.get_object()
        member.is_active = False
        member.save()
        return Response({'status': 'member deactivated'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a deactivated organization member."""
        member = self.get_object()
        member.is_active = True
        member.save()
        return Response({'status': 'member activated'})