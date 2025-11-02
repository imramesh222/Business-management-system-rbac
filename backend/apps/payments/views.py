from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import Payment
from .serializers import (
    PaymentSerializer, 
    PaymentListSerializer, 
    PaymentDetailSerializer,
    PaymentCreateSerializer,
    PaymentVerifySerializer,
    SubscriptionPaymentSerializer,
    SubscriptionPaymentCreateSerializer
)
from apps.users.permissions import IsAdmin, IsOrganizationMember
from apps.organization.models import OrganizationMember, OrganizationRoleChoices

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        - Admins can perform all actions
        - Organization admins and verifiers can view and manage payments
        - Regular users can only view their own payments
        """
        if self.action in ['list', 'retrieve', 'pending', 'stats']:
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'verify']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Filter payments based on user role:
        - Admins see all payments
        - Organization members see payments for their organization
        - Regular users see only their own payments
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        # If user is admin, return all payments
        if user.is_staff or user.is_superuser:
            return queryset
            
        try:
            # Get the user's organization membership
            member = OrganizationMember.objects.get(user=user)
            
            # Organization members see all payments for their organization
            # Filter by client's organization
            return queryset.filter(client__organization=member.organization)
                
        except OrganizationMember.DoesNotExist:
            # For users without an organization membership, return empty queryset
            return queryset.none()
    
    def perform_create(self, serializer):
        """Set the organization and processed_by fields when creating a payment."""
        # Get the client making the payment
        client = serializer.validated_data.get('client')
        
        # Set the organization from the client's organization
        organization = client.organization if hasattr(client, 'organization') else None
        
        # Set the processed_by field to the current user if they are staff or admin
        processed_by = None
        if self.request.user.is_staff or self.request.user.is_superuser:
            try:
                processed_by = OrganizationMember.objects.get(user=self.request.user)
            except OrganizationMember.DoesNotExist:
                pass
        
        serializer.save(organization=organization, processed_by=processed_by)
    
    def get_serializer_class(self):
        """Return appropriate serializer class based on action"""
        if self.action == 'list':
            return PaymentListSerializer
        elif self.action == 'retrieve':
            return PaymentDetailSerializer
        elif self.action == 'create':
            return PaymentCreateSerializer
        elif self.action == 'verify':
            return PaymentVerifySerializer
        return PaymentSerializer
    
    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        """Verify or reject a payment"""
        payment = self.get_object()
        serializer = PaymentVerifySerializer(data=request.data)
        
        if serializer.is_valid():
            verified = serializer.validated_data['verified']
            notes = serializer.validated_data.get('notes', '')
            
            # Get the verifier
            try:
                verifier = OrganizationMember.objects.get(user=request.user)
            except OrganizationMember.DoesNotExist:
                return Response(
                    {'error': 'Only organization members can verify payments'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Update payment
            payment.verified = verified
            payment.verified_by = verifier
            payment.verified_at = timezone.now()
            
            if verified:
                payment.status = 'completed'
                payment.completed_at = timezone.now()
            else:
                payment.status = 'failed'
            
            if notes:
                payment.notes = f"{payment.notes}\n\nVerification notes: {notes}" if payment.notes else f"Verification notes: {notes}"
            
            payment.save()
            
            return Response(
                PaymentDetailSerializer(payment).data,
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        """Get all pending payments"""
        queryset = self.get_queryset().filter(status='pending', verified=False)
        serializer = PaymentListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Get payment statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total_payments': queryset.count(),
            'pending': queryset.filter(status='pending').count(),
            'completed': queryset.filter(status='completed').count(),
            'failed': queryset.filter(status='failed').count(),
            'verified': queryset.filter(verified=True).count(),
            'unverified': queryset.filter(verified=False).count(),
            'total_amount': sum(p.amount for p in queryset.filter(status='completed')),
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], url_path='subscriptions')
    def subscription_payments(self, request):
        """Get all subscription payments"""
        queryset = self.get_queryset().filter(payment_type='subscription')
        serializer = SubscriptionPaymentSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='subscriptions/create')
    def create_subscription_payment(self, request):
        """Create a subscription payment"""
        serializer = SubscriptionPaymentCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            payment = serializer.save()
            return Response(
                SubscriptionPaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
