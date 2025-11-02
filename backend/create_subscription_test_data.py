#!/usr/bin/env python3
"""
Script to create test data for subscription payment system
Run: python3 create_subscription_test_data.py
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.organization.models import Organization, SubscriptionPlan, PlanDuration, OrganizationSubscription
from apps.payments.models import Payment
from decimal import Decimal
from datetime import date, timedelta

def create_subscription_test_data():
    """Create test subscription plans and payments"""
    
    print("🚀 Creating subscription test data...\n")
    
    # Get organization
    org = Organization.objects.first()
    if not org:
        print("❌ No organization found. Please create an organization first.")
        return
    
    print(f"✅ Using organization: {org.name}\n")
    
    # Create subscription plans
    print("📦 Creating subscription plans...")
    
    plans_data = [
        {
            'name': 'Basic',
            'description': 'Perfect for small teams getting started',
            'durations': [
                {'months': 1, 'price': 29.99, 'discount': 0},
                {'months': 6, 'price': 149.99, 'discount': 15},
                {'months': 12, 'price': 249.99, 'discount': 30, 'default': True},
            ]
        },
        {
            'name': 'Pro',
            'description': 'For growing teams with advanced needs',
            'durations': [
                {'months': 1, 'price': 99.99, 'discount': 0},
                {'months': 6, 'price': 499.99, 'discount': 15},
                {'months': 12, 'price': 899.99, 'discount': 25, 'default': True},
            ]
        },
        {
            'name': 'Enterprise',
            'description': 'For large organizations with custom requirements',
            'durations': [
                {'months': 1, 'price': 299.99, 'discount': 0},
                {'months': 6, 'price': 1499.99, 'discount': 15},
                {'months': 12, 'price': 2499.99, 'discount': 30, 'default': True},
            ]
        },
    ]
    
    created_plans = []
    for plan_data in plans_data:
        plan, created = SubscriptionPlan.objects.get_or_create(
            name=plan_data['name'],
            defaults={'description': plan_data['description']}
        )
        
        if created:
            print(f"   ✅ Created plan: {plan.name}")
        else:
            print(f"   ⚠️  Plan already exists: {plan.name}")
        
        # Create durations
        for duration_data in plan_data['durations']:
            duration, dur_created = PlanDuration.objects.get_or_create(
                plan=plan,
                duration_months=duration_data['months'],
                defaults={
                    'price': Decimal(str(duration_data['price'])),
                    'discount_percentage': Decimal(str(duration_data['discount'])),
                    'is_default': duration_data.get('default', False)
                }
            )
            if dur_created:
                print(f"      • {duration_data['months']} months - ${duration_data['price']}")
        
        created_plans.append(plan)
    
    print(f"\n✅ {len(created_plans)} subscription plans ready\n")
    
    # Create organization subscription
    print("📋 Creating organization subscription...")
    
    # Get Pro plan, 12 months duration
    pro_plan = SubscriptionPlan.objects.get(name='Pro')
    pro_12m = PlanDuration.objects.get(plan=pro_plan, duration_months=12)
    
    # Check if subscription exists
    subscription, sub_created = OrganizationSubscription.objects.get_or_create(
        organization=org,
        defaults={
            'plan_duration': pro_12m,
            'start_date': date.today(),
            'end_date': date.today() + timedelta(days=365),
            'is_active': True,
            'auto_renew': True
        }
    )
    
    if sub_created:
        print(f"   ✅ Created subscription: {subscription}")
    else:
        print(f"   ⚠️  Subscription already exists: {subscription}")
    
    print()
    
    # Create test subscription payments
    print("💳 Creating test subscription payments...")
    
    payment_data = [
        {
            'amount': Decimal('899.99'),
            'currency': 'USD',
            'payment_method': 'credit_card',
            'transaction_id': 'SUB-TXN-001',
            'status': 'completed',
            'verified': True,
            'notes': 'Initial subscription payment - Pro Plan 12 months'
        },
        {
            'amount': Decimal('899.99'),
            'currency': 'USD',
            'payment_method': 'bank_transfer',
            'transaction_id': 'SUB-TXN-002',
            'status': 'pending',
            'verified': False,
            'notes': 'Renewal payment - awaiting verification'
        },
        {
            'amount': Decimal('99.99'),
            'currency': 'USD',
            'payment_method': 'paypal',
            'transaction_id': 'SUB-TXN-003',
            'status': 'pending',
            'verified': False,
            'notes': 'Test payment - Pro Plan 1 month'
        },
    ]
    
    created_payments = []
    for data in payment_data:
        # Check if payment exists
        existing = Payment.objects.filter(transaction_id=data['transaction_id']).first()
        if existing:
            print(f"   ⚠️  Payment {data['transaction_id']} already exists")
            created_payments.append(existing)
            continue
        
        payment = Payment.objects.create(
            payment_type='subscription',
            organization=org,
            subscription=subscription,
            amount=data['amount'],
            currency=data['currency'],
            payment_method=data['payment_method'],
            transaction_id=data['transaction_id'],
            status=data['status'],
            verified=data['verified'],
            notes=data['notes']
        )
        created_payments.append(payment)
        print(f"   ✅ Created: {payment.transaction_id} - {payment.currency} {payment.amount} ({payment.status})")
    
    print(f"\n✅ {len(created_payments)} subscription payments ready\n")
    
    # Print summary
    print("=" * 70)
    print("📊 SUBSCRIPTION TEST DATA SUMMARY")
    print("=" * 70)
    
    print(f"\n📦 Subscription Plans: {SubscriptionPlan.objects.count()}")
    for plan in SubscriptionPlan.objects.all():
        print(f"   • {plan.name}")
        for duration in plan.durations.all():
            print(f"     - {duration.duration_months} months: ${duration.price}")
    
    print(f"\n🏢 Organization: {org.name}")
    print(f"   Current Plan: {subscription.plan_duration.plan.name}")
    print(f"   Duration: {subscription.plan_duration.duration_months} months")
    print(f"   Valid Until: {subscription.end_date}")
    print(f"   Days Remaining: {subscription.days_remaining}")
    
    print(f"\n💳 Subscription Payments: {len(created_payments)}")
    for payment in created_payments:
        status_icon = "✅" if payment.verified else "⏳"
        print(f"   {status_icon} {payment.transaction_id}")
        print(f"      Amount: {payment.currency} {payment.amount}")
        print(f"      Status: {payment.status}")
        print(f"      Verified: {payment.verified}")
    
    print("\n" + "=" * 70)
    print("🎯 NEXT STEPS")
    print("=" * 70)
    
    print("\n1. Start frontend: cd frontend1 && pnpm dev")
    print("2. Navigate to: http://localhost:3000/organization/billing")
    print("3. You should see:")
    print("   • Current subscription (Pro Plan - 12 months)")
    print("   • 3 subscription payments in history")
    print("   • 2 pending payments ready for verification")
    print("\n4. Test creating a new payment:")
    print("   • Click 'Make Payment' button")
    print(f"   • Use Organization ID: {org.id}")
    print(f"   • Use Subscription ID: {subscription.id}")
    
    print("\n5. Test verification:")
    print("   • Go to: http://localhost:3000/organization/payments")
    print("   • Find subscription payments (payment_type: subscription)")
    print("   • Click 'Verify' to approve/reject")
    
    print("\n✨ Happy Testing!\n")

if __name__ == '__main__':
    try:
        create_subscription_test_data()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print("\nMake sure:")
        print("1. Backend is set up correctly")
        print("2. Database migrations are run")
        print("3. You have at least one organization")
        sys.exit(1)
