# 🧪 Test Subscription Payment System

## ✅ Test Data Created!

Your subscription payment system is ready to test with:
- **3 Subscription Plans** (Basic, Pro, Enterprise)
- **1 Active Subscription** (Pro Plan for Bharambyte)
- **3 Test Payments** (1 completed, 2 pending)

---

## 🚀 Quick Start Testing

### Step 1: Start Your Servers

**Backend is already running** ✅

**Start Frontend:**
```bash
cd /Users/rameshrawat/projectK/frontend1
pnpm dev
```

---

### Step 2: Test Billing Page

#### Open Billing Page:
```
http://localhost:3000/organization/billing
```

#### What You Should See:
1. **Current Subscription Card**
   - Plan: Pro
   - Duration: 1 month
   - Status: Active (⚠️ Expired - Days Remaining: -51)

2. **Payment History Table**
   - 3 subscription payments
   - Mix of completed and pending
   - Transaction IDs: SUB-TXN-001, SUB-TXN-002, SUB-TXN-003

---

### Step 3: Test Creating Payment

#### Click "Make Payment" Button

#### Fill in the Form:
```
Amount: 899.99
Currency: USD
Payment Method: Credit Card
Transaction ID: SUB-TXN-TEST-004
Organization ID: 50f284ac-ad09-4c8c-8cbd-8662dbf2be77
Subscription ID: 1
Notes: Test subscription payment
```

#### Click "Submit Payment"
- ✅ Should see success toast
- ✅ Payment appears in table
- ✅ Status: Pending

---

### Step 4: Test Payment Verification

#### Go to General Payments Page:
```
http://localhost:3000/organization/payments
```

#### Find Subscription Payments:
- Look for payments with "Subscription:" in client column
- Should see SUB-TXN-002 and SUB-TXN-003 as pending

#### Verify a Payment:
1. Click "Verify" button on SUB-TXN-002
2. Review payment details
3. Add note: "Approved for testing"
4. Click "Approve"
5. ✅ Status changes to "Completed"
6. ✅ Verified column shows ✓

---

## 📊 Test Scenarios

### Scenario 1: View Payment History
```
1. Go to: http://localhost:3000/organization/billing
2. Scroll to "Payment History" table
3. Verify you see 3 payments
4. Check transaction IDs match
5. Verify status badges show correct colors
```

### Scenario 2: Create New Payment
```
1. Click "Make Payment"
2. Enter test data
3. Submit
4. Verify payment appears in table
5. Check status is "Pending"
```

### Scenario 3: Approve Payment
```
1. Go to payments page
2. Find pending subscription payment
3. Click "Verify"
4. Click "Approve"
5. Verify status changes to "Completed"
6. Check verified icon appears
```

### Scenario 4: Reject Payment
```
1. Find another pending payment
2. Click "Verify"
3. Add rejection note
4. Click "Reject"
5. Verify status changes to "Failed"
```

---

## 🔍 API Testing

### Test Subscription Payments Endpoint:
```bash
curl http://localhost:8000/api/v1/payments/payments/subscriptions/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "amount": "899.99",
    "currency": "USD",
    "status": "completed",
    "organization_name": "Bharambyte",
    "subscription_plan": {
      "plan_name": "Pro",
      "duration_months": 1,
      "price": "99.99"
    },
    ...
  }
]
```

### Create Subscription Payment via API:
```bash
curl -X POST http://localhost:8000/api/v1/payments/payments/subscriptions/create/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 899.99,
    "currency": "USD",
    "payment_method": "credit_card",
    "transaction_id": "SUB-API-TEST-001",
    "organization": "50f284ac-ad09-4c8c-8cbd-8662dbf2be77",
    "subscription": "1",
    "notes": "API test payment"
  }'
```

---

## ✅ Verification Checklist

### Billing Page (`/organization/billing`):
- [ ] Page loads without errors
- [ ] Current subscription card displays
- [ ] Payment history table shows 3 payments
- [ ] Transaction IDs visible
- [ ] Status badges show correct colors
- [ ] Verified icons display correctly
- [ ] "Make Payment" button works
- [ ] Payment dialog opens
- [ ] Form validation works
- [ ] Can submit new payment
- [ ] New payment appears in table

### Payments Page (`/organization/payments`):
- [ ] Subscription payments visible
- [ ] Can filter/identify subscription payments
- [ ] "Verify" button appears on pending payments
- [ ] Verification dialog works
- [ ] Can approve payment
- [ ] Can reject payment
- [ ] Status updates correctly
- [ ] Verified icon updates

### API Endpoints:
- [ ] GET `/subscriptions/` returns data
- [ ] POST `/subscriptions/create/` works
- [ ] Payment verification works
- [ ] Stats include subscription payments

---

## 🎯 Test Data Reference

### Organization:
```
ID: 50f284ac-ad09-4c8c-8cbd-8662dbf2be77
Name: Bharambyte
```

### Subscription:
```
ID: 1
Plan: Pro
Duration: 1 month
Status: Active (Expired)
```

### Test Payments:
```
1. SUB-TXN-001 - $899.99 - Completed ✅
2. SUB-TXN-002 - $899.99 - Pending ⏳
3. SUB-TXN-003 - $99.99 - Pending ⏳
```

---

## 🐛 Troubleshooting

### Issue: "Failed to load subscription payments"
**Check:**
- Backend is running
- You're logged in
- Organization membership exists
- API endpoint: `http://localhost:8000/api/v1/payments/payments/subscriptions/`

### Issue: Empty payment history
**Solution:**
```bash
cd /Users/rameshrawat/projectK/backend
python3 create_subscription_test_data.py
```

### Issue: Can't create payment
**Check:**
- Organization ID is correct
- All required fields filled
- Browser console for errors

### Issue: Verification not working
**Check:**
- Payment is in "pending" status
- You have permissions
- Backend logs for errors

---

## 📝 Expected Results

### After Testing All Scenarios:

**Billing Page Should Show:**
- Current subscription: Pro Plan
- Payment history: 4-5 payments
- Mix of completed/pending/failed statuses

**Payments Page Should Show:**
- All payments (project + subscription)
- Subscription payments identifiable
- Correct verification status

**API Should Return:**
- Subscription payments filtered correctly
- Correct payment details
- Updated statuses after verification

---

## 🎊 Success Criteria

Your subscription payment system is working if:

✅ Can view billing page  
✅ Can see payment history  
✅ Can create new subscription payment  
✅ Payment appears in table  
✅ Can verify/approve payment  
✅ Can reject payment  
✅ Status updates correctly  
✅ API endpoints work  
✅ No console errors  
✅ Data persists after refresh  

---

## 🆘 Need Help?

### Check Backend Logs:
Look for successful API calls:
```
[31/Oct/2025 20:45:00] "GET /api/v1/payments/payments/subscriptions/ HTTP/1.1" 200 OK
[31/Oct/2025 20:45:05] "POST /api/v1/payments/payments/subscriptions/create/ HTTP/1.1" 201 Created
```

### Check Browser Console:
Should see successful requests:
```
GET http://localhost:8000/api/v1/payments/payments/subscriptions/ 200 OK
POST http://localhost:8000/api/v1/payments/payments/subscriptions/create/ 201 Created
```

### Test API Directly:
```bash
# List subscription payments
curl http://localhost:8000/api/v1/payments/payments/subscriptions/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check stats
curl http://localhost:8000/api/v1/payments/payments/stats/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 Next Steps After Testing

1. ✅ Verify all features work
2. ✅ Test edge cases
3. ✅ Check error handling
4. ✅ Confirm data persistence
5. ✅ Review UI/UX
6. ✅ Test on different browsers
7. ✅ Check mobile responsiveness

---

**Ready to test! Start with the billing page and work through each scenario.** 🚀

**Testing Guide Complete!** ✨
