import uuid
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser, BaseUserManager, PermissionsMixin
)
from django.utils.translation import gettext_lazy as _

class RoleChoices(models.TextChoices):
    USER = 'user', 'User'  # Default role for all users
    SUPERADMIN = 'superadmin', 'Superadmin'  # Only for system-wide superusers

class UserManager(BaseUserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
            
        email = self.normalize_email(email)
        
        # Auto-generate username if not provided
        if not username:
            # Use the part before @ in the email as the base for username
            base_username = email.split('@')[0]
            
            # Clean the username to ensure it's valid
            import re
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username)
            
            # If the username is empty after cleaning, use a default
            if not base_username:
                base_username = 'user'
                
            username = base_username
            
            # Ensure username is unique and not empty
            counter = 1
            while not username or User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
        
        # Ensure username is not empty
        if not username:
            raise ValueError('Could not generate a valid username')
            
        # Ensure username is unique (case-insensitive check)
        if User.objects.filter(username__iexact=username).exists():
            raise ValueError('A user with this username already exists')
        
        user = self.model(username=username, email=email, **extra_fields)
        
        if password:
            user.set_password(password)
        
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('role', RoleChoices.SUPERADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(username, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128)
    first_name = models.CharField(max_length=30, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    role = models.CharField(max_length=32, choices=RoleChoices.choices, default=RoleChoices.USER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    date_joined = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    last_login = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Custom related names for groups and user_permissions
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name="custom_user_set",
        related_query_name="user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name="custom_user_set",
        related_query_name="user",
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def requires_password_change(self):
        return hasattr(self, 'profile') and getattr(self.profile, 'password_change_required', False)

    objects = UserManager()

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        # Create a profile if it doesn't exist
        if not hasattr(self, 'profile'):
            UserProfile.objects.create(user=self)
        super().save(*args, **kwargs)

    def get_full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username

    def get_short_name(self):
        return self.first_name if self.first_name else self.username

    class Meta:
        db_table = 'users'
        verbose_name = _('user')
        verbose_name_plural = _('users')


import datetime
from django.utils import timezone

class UserProfile(models.Model):
    """Extended user profile information."""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        primary_key=True
    )
    password_change_required = models.BooleanField(
        default=True,  # Changed default to True to force password change on first login
        help_text='If True, user will be prompted to change their password on next login.'
    )
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def generate_otp(self, length=6):
        """Generate a one-time password and set its expiration."""
        import random
        import string
        
        # Generate a random 6-digit OTP
        self.otp = ''.join(random.choices(string.digits, k=length))
        self.otp_created_at = timezone.now()
        self.save()
        return self.otp
        
    def is_otp_valid(self, otp):
        """Check if the provided OTP is valid and not expired."""
        if not self.otp or not self.otp_created_at:
            return False
            
        # OTP expires after 24 hours
        expiry_time = self.otp_created_at + datetime.timedelta(hours=24)
        return self.otp == otp and timezone.now() <= expiry_time
        
    def clear_otp(self):
        """Clear the OTP after successful use."""
        self.otp = None
        self.otp_created_at = None
        self.save()

    def __str__(self):
        return f"Profile for {self.user.email}"