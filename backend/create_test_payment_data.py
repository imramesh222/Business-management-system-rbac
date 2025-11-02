#!/usr/bin/env python3
"""
Script to create test data for payment system testing
Run: python3 create_test_payment_data.py
"""

import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from apps.clients.models import Client
from apps.organization.models import Organization
from apps.payments.models import Payment
from decimal import Decimal

def create_test_data():
    """Create test clients and payments for frontend testing"""
    
    print("🚀 Creating test data for payment system...\n")
    
    # Get or create organization
    org = Organization.objects.first()
    if not org:
        print("❌ No organization found. Please create an organization first.")
        print("   Run: python3 manage.py shell")
        print("   Then: from apps.organization.models import Organization")
        print("         org = Organization.objects.create(name='Test Org')")
        return
    
    print(f"✅ Using organization: {org.name}\n")
    
    # Create test clients
    print("📝 Creating test clients...")
    clients = []
    
    for i in range(1, 4):
        client, created = Client.objects.get_or_create(
            email=f"testclient{i}@example.com",
            defaults={
                'name': f"Test Client {i}",
                'phone': f"+123456789{i}",
                'organization': org,
                'status': 'active',
                'address': f"{i}23 Test Street",
                'city': 'Test City',
                'country': 'Test Country',
            }
        )
        clients.append(client)
        status = "Created" if created else "Already exists"
        print(f"   {status}: {client.name} (ID: {client.id})")
    
    print(f"\n✅ {len(clients)} clients ready\n")
    
    # Create test payments
    print("💳 Creating test payments...")
    
    payment_data = [
        {
            'amount': Decimal('1500.00'),
            'currency': 'USD',
            'payment_method': 'credit_card',
            'transaction_id': 'TXN-TEST-001',
            'notes': 'Test payment 1 - Ready to approve',
            'status': 'pending',
        },
        {
            'amount': Decimal('2000.00'),
            'currency': 'USD',
            'payment_method': 'bank_transfer',
            'transaction_id': 'TXN-TEST-002',
            'notes': 'Test payment 2 - Ready to reject',
            'status': 'pending',
        },
        {
            'amount': Decimal('1000.00'),
            'currency': 'EUR',
            'payment_method': 'paypal',
            'transaction_id': 'TXN-TEST-003',
            'notes': 'Test payment 3 - Leave pending',
            'status': 'pending',
        },
        {
            'amount': Decimal('3500.00'),
            'currency': 'USD',
            'payment_method': 'debit_card',
            'transaction_id': 'TXN-TEST-004',
            'notes': 'Test payment 4 - High value',
            'status': 'pending',
        },
        {
            'amount': Decimal('500.00'),
            'currency': 'GBP',
            'payment_method': 'other',
            'transaction_id': 'TXN-TEST-005',
            'notes': 'Test payment 5 - Low value',
            'status': 'pending',
        },
    ]
    
    created_payments = []
    for i, data in enumerate(payment_data):
        # Assign client in round-robin fashion
        client = clients[i % len(clients)]
        
        # Check if payment already exists
        existing = Payment.objects.filter(transaction_id=data['transaction_id']).first()
        if existing:
            print(f"   ⚠️  Payment {data['transaction_id']} already exists")
            created_payments.append(existing)
            continue
        
        payment = Payment.objects.create(
            client=client,
            **data
        )
        created_payments.append(payment)
        print(f"   ✅ Created: {payment.transaction_id} - {payment.currency} {payment.amount}")
    
    print(f"\n✅ {len(created_payments)} payments ready\n")
    
    # Print summary
    print("=" * 60)
    print("📊 TEST DATA SUMMARY")
    print("=" * 60)
    print(f"\n👥 Clients Created: {len(clients)}")
    for client in clients:
        print(f"   • {client.name}")
        print(f"     ID: {client.id}")
        print(f"     Email: {client.email}\n")
    
    print(f"💳 Payments Created: {len(created_payments)}")
    for payment in created_payments:
        print(f"   • {payment.transaction_id}")
        print(f"     Amount: {payment.currency} {payment.amount}")
        print(f"     Client: {payment.client.name}")
        print(f"     Status: {payment.status}\n")
    
    print("=" * 60)
    print("🎯 NEXT STEPS")
    print("=" * 60)
    print("\n1. Start frontend: cd frontend1 && pnpm dev")
    print("2. Navigate to: http://localhost:3000/organization/payments")
    print("3. You should see all test payments in the table")
    print("4. Try verifying/rejecting payments")
    print("\n✨ Happy Testing!\n")

if __name__ == '__main__':
    try:
        create_test_data()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. Backend is set up correctly")
        print("2. Database migrations are run")
        print("3. You have at least one organization")
        sys.exit(1)
