from rest_framework import serializers
from .models import Payment
from apps.clients.serializers import ClientSerializer
from apps.projects.serializers import ProjectSerializer

class PaymentListSerializer(serializers.ModelSerializer):
    """Serializer for listing payments with minimal info"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True, allow_null=True)
    verified_by_name = serializers.CharField(source='verified_by.user.email', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'status', 'status_display',
            'payment_method', 'payment_method_display', 'transaction_id',
            'client', 'client_name', 'project', 'project_title',
            'verified', 'verified_by', 'verified_by_name',
            'created_at', 'verified_at', 'completed_at'
        ]
        ref_name = 'payments.PaymentList'

class PaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed payment view"""
    client = ClientSerializer(read_only=True)
    project = ProjectSerializer(read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.user.email', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        ref_name = 'payments.PaymentDetail'

class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments"""
    class Meta:
        model = Payment
        fields = [
            'amount', 'currency', 'payment_method', 'transaction_id',
            'client', 'project', 'notes'
        ]
        ref_name = 'payments.PaymentCreate'

class PaymentVerifySerializer(serializers.Serializer):
    """Serializer for verifying payments"""
    verified = serializers.BooleanField(required=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        ref_name = 'payments.PaymentVerify'

class PaymentSerializer(serializers.ModelSerializer):
    """Default payment serializer"""
    class Meta:
        model = Payment
        fields = '__all__'
        ref_name = 'payments.Payment'

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    """Serializer for subscription payments"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    subscription_plan = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'currency', 'status', 'status_display',
            'payment_method', 'payment_method_display', 'transaction_id',
            'payment_type', 'organization', 'organization_name',
            'subscription', 'subscription_plan', 'verified', 'verified_by',
            'notes', 'created_at', 'verified_at', 'completed_at'
        ]
        ref_name = 'payments.SubscriptionPayment'
    
    def get_subscription_plan(self, obj):
        if obj.subscription and obj.subscription.plan_duration:
            return {
                'plan_name': obj.subscription.plan_duration.plan.name,
                'duration_months': obj.subscription.plan_duration.duration_months,
                'price': str(obj.subscription.plan_duration.price)
            }
        return None

class SubscriptionPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subscription payments"""
    class Meta:
        model = Payment
        fields = [
            'amount', 'currency', 'payment_method', 'transaction_id',
            'organization', 'subscription', 'notes'
        ]
        ref_name = 'payments.SubscriptionPaymentCreate'
    
    def validate(self, data):
        # Ensure payment_type is set to subscription
        data['payment_type'] = 'subscription'
        
        # Validate that organization is provided
        if not data.get('organization'):
            raise serializers.ValidationError("Organization is required for subscription payments")
        
        return data