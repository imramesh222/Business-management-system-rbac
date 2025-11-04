"""
User-related serializers.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class OrganizationMemberSerializer(serializers.Serializer):
    """Serializer for organization membership information."""
    organization_id = serializers.UUIDField(source='organization.id')
    organization_name = serializers.CharField(source='organization.name')
    role = serializers.SerializerMethodField()
    
    def get_role(self, obj):
        # Check if this is an OrganizationMember instance
        if hasattr(obj, 'role'):
            return obj.role
            
        # Fallback to checking role-specific models
        if hasattr(obj, 'admin') and obj.is_active:
            return 'admin'
        if hasattr(obj, 'salesperson'):
            return 'salesperson'
        if hasattr(obj, 'verifier'):
            return 'verifier'
        if hasattr(obj, 'projectmanager'):
            return 'project_manager'
        if hasattr(obj, 'developer'):
            return 'developer'
        if hasattr(obj, 'support'):
            return 'support'
            
        return 'member'

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration and basic info.
    Includes password field for write operations only.
    """
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password', 'placeholder': 'Leave blank to auto-generate'},
        help_text="Optional. If blank, a secure password will be auto-generated.",
        min_length=8
    )
    auto_generate_password = serializers.BooleanField(
        write_only=True,
        required=False,
        default=False,
        help_text="If True, a secure password will be auto-generated and sent to the user's email."
    )
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined',
            'last_login', 'password', 'auto_generate_password'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_active', 'is_staff', 'is_superuser']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'username': {'required': False, 'allow_blank': True},
        }
    
    def validate_email(self, value):
        """
        Ensure email is unique and doesn't conflict with organization emails.
        Also ensures the email is normalized to lowercase.
        """
        from apps.organization.models import Organization
        
        value = value.lower()
        
        # Check if email already exists for a user
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
            
        # Check if email is used by any organization
        if Organization.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use by an organization.")
            
        return value
    
    def create(self, validated_data):
        """Create and return a new user with encrypted password."""
        password = validated_data.pop('password', None)
        auto_generate = validated_data.pop('auto_generate_password', False)
        request = self.context.get('request')
        
        # Generate username from email if not provided
        if 'username' not in validated_data or not validated_data.get('username'):
            # Use the part before @ in the email as the base for username
            email_base = validated_data['email'].split('@')[0]
            validated_data['username'] = email_base
            
            # Ensure username is unique
            counter = 1
            while User.objects.filter(username=validated_data['username']).exists():
                validated_data['username'] = f"{email_base}{counter}"
                counter += 1
        
        user = User(**validated_data)
        
        if password:
            # Store the raw password on the instance before hashing
            user._password = password
            user.set_password(password)
        elif auto_generate:
            # Generate a random password
            from django.utils.crypto import get_random_string
            password = get_random_string(12)
            # Store the raw password on the instance before hashing
            user._password = password
            user.set_password(password)
        
        # Store the request on the instance for the signal to check admin status
        if request:
            user._request = request
        
        user.save()
        return user
    
    def update(self, instance, validated_data):
        """Update and return an existing user instance."""
        password = validated_data.pop('password', None)
        auto_generate = validated_data.pop('auto_generate_password', False)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        elif auto_generate:
            from django.utils.crypto import get_random_string
            password = get_random_string(12)
            instance.set_password(password)
            # Email the new password to the user
            # send_password_email.delay(instance.email, password)
        
        instance.save()
        return instance

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that handles email-based authentication.
    """
    username_field = 'email'  # Use email as the username field
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove the username field and add email field
        self.fields['email'] = serializers.EmailField(required=True)
        if 'username' in self.fields:
            del self.fields['username']
    
    def validate(self, attrs):
        print("\n=== Starting authentication ===")
        print(f"Received login request with email: {attrs.get('email')}")
        
        # Get the email and password from the request data
        email = attrs.get('email')
        password = attrs.get('password')
        
        if not email or not password:
            print("Error: Email or password missing in request")
            raise serializers.ValidationError({
                'email': 'Email is required',
                'password': 'Password is required'
            })
        
        print(f"Attempting to authenticate user: {email}")
        user = self.authenticate_user(email, password)
        
        if not user:
            print(f"Authentication failed for user: {email}")
            raise serializers.ValidationError({
                'non_field_errors': ['Unable to log in with provided credentials.']
            })
        
        print(f"User found: ID={user.id}, Email={user.email}, IsSuperuser={getattr(user, 'is_superuser', 'N/A')}")
        
        if not user.is_active:
            print(f"Login failed: User {user.email} is inactive")
            raise serializers.ValidationError({
                'non_field_errors': ['This user has been deactivated.']
            })
        
        # Generate tokens using the auth_serializer's get_token method
        print("Generating tokens...")
        from apps.users.serializers.auth_serializers import CustomTokenObtainPairSerializer as AuthSerializer
        auth_serializer = AuthSerializer()
        refresh = auth_serializer.get_token(user)
        
        # Get the role and organization info from the token
        role = refresh.get('role', 'user')
        organization_id = refresh.get('organization_id')
        organization_name = refresh.get('organization_name')
        organization_role = refresh.get('organization_role', role)
        
        print(f"Token generated with role: {role}, org_role: {organization_role}, org_id: {organization_id}")
        
        # Prepare the response data
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'role': organization_role,
            'organization_role': organization_role,
            'organization_id': organization_id,
            'organization_name': organization_name,
            'is_staff': refresh.get('is_staff', False),
            'is_superuser': refresh.get('is_superuser', False),
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'is_staff': refresh.get('is_staff', False),
                'is_superuser': refresh.get('is_superuser', False),
                'role': organization_role,
                'organization_role': organization_role,
                'organization_id': organization_id,
                'organization_name': organization_name
            }
        }
        
        print(f"Authentication successful. Role set to: {role}")
        print("=== Authentication complete ===\n")
        return data
    
    def authenticate_user(self, email, password):
        """Authenticate a user with email and password."""
        print(f"\nAttempting to authenticate user: {email}")
        User = get_user_model()
        user = None
        email_exists = False
        
        # First check if any user exists with this email (case-insensitive)
        try:
            User.objects.get(email__iexact=email)
            email_exists = True
            print(f"Email {email} exists in the system")
            
            # Now try exact match for case sensitivity
            try:
                user = User.objects.get(email=email)
                print(f"Found user with exact email match: ID={user.id}, Email={user.email}")
                print(f"User is superuser: {getattr(user, 'is_superuser', False)}")
                print(f"User is active: {user.is_active}")
                
                if user.check_password(password):
                    print("Password validation successful")
                    return user
                    
                print("Password validation failed")
                # Password was incorrect
                raise serializers.ValidationError({
                    'non_field_errors': ['Invalid password. Please try again.']
                })
                
            except User.DoesNotExist:
                # Case mismatch - email exists but with different case
                print(f"Email case mismatch for: {email}")
                user = User.objects.get(email__iexact=email)
                if user.check_password(password):
                    print("Password validation successful despite case mismatch")
                    return user
                
                # Password was incorrect for case-mismatched email
                raise serializers.ValidationError({
                    'non_field_errors': ['Invalid password. Please try again.']
                })
                
        except User.DoesNotExist:
            # No user found with this email (case-insensitive)
            print(f"No user found with email: {email}")
            raise serializers.ValidationError({
                'email': ['No account found with this email address. Please check and try again.']
            })
            
        except Exception as e:
            print(f"Unexpected error during authentication: {str(e)}")
            raise serializers.ValidationError({
                'non_field_errors': ['Invalid Email or Password !']
            })
    
    @classmethod
    def get_token(cls, user):
        """
        Generate the token with custom claims.
        This is now a pass-through to the auth_serializer's get_token method
        to ensure consistent token generation.
        """
        from apps.users.serializers.auth_serializers import CustomTokenObtainPairSerializer as AuthSerializer
        auth_serializer = AuthSerializer()
        return auth_serializer.get_token(user)
