import uuid
from django.db import models
from django.utils import timezone
from apps.clients.models import Client
from apps.organization.models import OrganizationMember, Organization, OrganizationSubscription
from apps.projects.models import Project

class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('cancelled', 'Cancelled'),
    ]
    
    PAYMENT_METHODS = [
        ('credit_card', 'Credit Card'),
        ('debit_card', 'Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('paypal', 'PayPal'),
        ('other', 'Other'),
    ]
    
    PAYMENT_TYPES = [
        ('project', 'Project Payment'),
        ('subscription', 'Subscription Payment'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        help_text="Payment amount"
    )
    currency = models.CharField(
        max_length=3, 
        default='USD',
        help_text="Currency code (e.g., USD, EUR, GBP)"
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text="Current status of the payment"
    )
    payment_method = models.CharField(
        max_length=20, 
        choices=PAYMENT_METHODS, 
        default='credit_card',
        help_text="Payment method used"
    )
    transaction_id = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Transaction ID from payment gateway"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPES,
        default='project',
        help_text="Type of payment (project or subscription)"
    )
    
    # For project payments
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='payments',
        help_text="Client who made the payment",
        null=True,
        blank=True
    )
    project = models.OneToOneField(
        Project, 
        on_delete=models.CASCADE, 
        related_name='payment',
        help_text="Project this payment is for",
        null=True,
        blank=True
    )
    
    # For subscription payments
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription_payments',
        help_text="Organization making the subscription payment",
        null=True,
        blank=True
    )
    subscription = models.ForeignKey(
        OrganizationSubscription,
        on_delete=models.SET_NULL,
        related_name='payments',
        help_text="Subscription this payment is for",
        null=True,
        blank=True
    )
    
    verified = models.BooleanField(
        default=False,
        help_text="Whether the payment has been verified"
    )
    verified_by = models.ForeignKey(
        OrganizationMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_payments',
        help_text="Staff who verified this payment"
    )
    notes = models.TextField(blank=True, null=True, help_text="Additional notes about the payment")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        if self.payment_type == 'subscription' and self.organization:
            return f"{self.amount} {self.currency} - {self.get_status_display()} (Subscription: {self.organization.name})"
        elif self.client:
            return f"{self.amount} {self.currency} - {self.get_status_display()} (Project: {self.client.name})"
        return f"{self.amount} {self.currency} - {self.get_status_display()}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['verified']),
        ]

    def save(self, *args, **kwargs):
        # Update timestamps based on status changes
        if self.verified and not self.verified_at:
            self.verified_at = timezone.now()
        if self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)