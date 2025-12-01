import uuid
from django.db import models
from django.utils import timezone
from model_utils import FieldTracker
from apps.organization.models import OrganizationMember, OrganizationRoleChoices
from apps.clients.models import Client

class Project(models.Model):
    PROJECT_STATUS = [
        ('planning', 'Planning'),
        ('in_progress', 'In Progress'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255, help_text="Project title or name")
    description = models.TextField(help_text="Detailed project description")
    status = models.CharField(
        max_length=20, 
        choices=PROJECT_STATUS, 
        default='planning',
        help_text="Current status of the project"
    )
    cost = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text="Total project cost"
    )
    discount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        default=0.00,
        help_text="Discount amount (if any)"
    )
    start_date = models.DateField(
        null=True, 
        blank=True,
        help_text="Project start date"
    )
    deadline = models.DateField(
        null=True, 
        blank=True,
        help_text="Project deadline"
    )
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='projects',
        help_text="Client who owns this project"
    )
    salesperson = models.ForeignKey(
        'organization.OrganizationMember',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_projects'  # Changed from default
    )
    project_manager = models.ForeignKey(
        OrganizationMember,
        on_delete=models.SET_NULL,
        related_name='managed_projects',
        null=True,
        blank=True,
        limit_choices_to={'role': OrganizationRoleChoices.PROJECT_MANAGER},
        help_text="Project manager overseeing this project"
    )
    verifier = models.ForeignKey(
        OrganizationMember,
        on_delete=models.SET_NULL,
        related_name='verifier',
        null=True,
        blank=True,
        limit_choices_to={'role': OrganizationRoleChoices.VERIFIER},
        help_text="Verifier responsible for this project"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the project has been verified"
    )
    team_members = models.ManyToManyField(
        'organization.OrganizationMember',
        related_name='team_projects',  # Changed from default
        blank=True
    )
    tracker = FieldTracker(fields=['status'])
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.client.name})"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_verified']),
        ]
        
    @property
    def total_tasks(self):
        return self.tasks.count()
        
    @property
    def completed_tasks(self):
        return self.tasks.filter(status='completed').count()
        
    @property
    def progress(self):
        if self.total_tasks == 0:
            return 0
        return int((self.completed_tasks / self.total_tasks) * 100)