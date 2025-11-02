# 🧪 Testing Payment System - Frontend Guide

## 📋 Prerequisites

Before testing, ensure:
1. ✅ Backend is running on `http://localhost:8000`
2. ✅ Frontend is running on `http://localhost:3000`
3. ✅ You're logged in as an admin or organization member
4. ✅ You have at least one client created

---

## 🚀 Step-by-Step Testing Guide

### Step 1: Start Your Servers

#### Terminal 1: Backend
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
python3 manage.py runserver
```

#### Terminal 2: Frontend
```bash
cd /Users/rameshrawat/projectK/frontend1
pnpm dev
```

---

### Step 2: Create Test Data (If Needed)

#### Option A: Using Django Admin
1. Go to: `http://localhost:8000/admin/`
2. Login with superuser credentials
3. Navigate to **Clients** → **Add Client**
4. Create a test client (note the UUID)

#### Option B: Using Django Shell
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
python3 manage.py shell
```

Then run:
```python
from apps.clients.models import Client
from apps.organization.models import Organization

# Get or create an organization
org = Organization.objects.first()

# Create a test client
client = Client.objects.create(
    name="Test Client",
    email="testclient@example.com",
    phone="+1234567890",
    organization=org,
    status='active'
)

print(f"Client created with ID: {client.id}")
# Copy this ID for testing
```

---

### Step 3: Access Payment Page

1. Open browser: `http://localhost:3000`
2. Login with your credentials
3. Navigate to: **Organization** → **Payments**
   - Or directly: `http://localhost:3000/organization/payments`

---

### Step 4: Test Payment Creation

#### 4.1 Click "Add Payment" Button
- Located in the top-right corner

#### 4.2 Fill in the Form:
```
Amount: 1500.00
Currency: USD
Payment Method: Credit Card
Transaction ID: TXN-TEST-001 (optional)
Client ID: [paste the client UUID from Step 2]
Project ID: [leave empty for now]
Notes: Test payment for frontend testing
```

#### 4.3 Click "Create Payment"
- ✅ Should see success toast notification
- ✅ Payment should appear in the table
- ✅ Status should be "Pending"
- ✅ Verified column should show ✗ (not verified)

---

### Step 5: Test Payment Verification

#### 5.1 Find Your Test Payment
- Look for the payment you just created in the table

#### 5.2 Click "Verify" Button
- Located in the Actions column

#### 5.3 Review Payment Details
- Check amount, client name, payment method
- Add verification notes (optional): "Verified for testing"

#### 5.4 Test Approval:
- Click **"Approve"** button
- ✅ Should see success toast
- ✅ Status should change to "Completed"
- ✅ Verified column should show ✓ (green checkmark)
- ✅ Statistics should update

#### 5.5 Test Rejection (Create Another Payment):
- Create another test payment
- Click "Verify"
- Click **"Reject"** button
- ✅ Status should change to "Failed"

---

### Step 6: Test Payment Details View

#### 6.1 Click Eye Icon (👁️)
- Located in the Actions column for any payment

#### 6.2 Verify Details Dialog Shows:
- ✅ Amount and currency
- ✅ Status badge
- ✅ Client name
- ✅ Project (if linked)
- ✅ Payment method
- ✅ Transaction ID
- ✅ Verification status
- ✅ Verifier name (if verified)
- ✅ Created date
- ✅ Completed date (if completed)
- ✅ Notes (if any)

---

### Step 7: Test Statistics Dashboard

#### 7.1 Check Statistics Cards:
- **Total Payments**: Should show count and total amount
- **Pending**: Should show pending count
- **Completed**: Should show completed count
- **Failed**: Should show failed count

#### 7.2 Create Multiple Payments:
- Create 3-4 more test payments
- Verify some, reject others
- Watch statistics update in real-time

---

## 🎯 Test Scenarios

### Scenario 1: Happy Path (Success Flow)
```
1. Create payment → Status: Pending
2. Verify payment → Status: Completed
3. Check statistics → Completed count increases
4. View details → All info displayed correctly
```

### Scenario 2: Rejection Flow
```
1. Create payment → Status: Pending
2. Reject payment → Status: Failed
3. Check statistics → Failed count increases
4. View details → Rejection notes visible
```

### Scenario 3: Multiple Payments
```
1. Create 5 payments
2. Approve 3 payments
3. Reject 2 payments
4. Check statistics:
   - Total: 5
   - Completed: 3
   - Failed: 2
   - Pending: 0
```

---

## ✅ What to Verify

### Visual Elements:
- [ ] Page loads without errors
- [ ] Statistics cards display correctly
- [ ] Table shows all columns
- [ ] Status badges have correct colors
- [ ] Verification icons show correctly
- [ ] Buttons are clickable
- [ ] Dialogs open and close properly

### Functionality:
- [ ] Can create new payment
- [ ] Can verify payment (approve)
- [ ] Can reject payment
- [ ] Can view payment details
- [ ] Statistics update in real-time
- [ ] Toast notifications appear
- [ ] Form validation works
- [ ] Data persists after page refresh

### Data Integrity:
- [ ] Payment amounts display correctly
- [ ] Client names show properly
- [ ] Dates format correctly
- [ ] Status changes persist
- [ ] Verification info saves
- [ ] Notes are stored

---

## 🐛 Common Issues & Solutions

### Issue 1: "Failed to load payments"
**Solution:**
- Check backend is running: `http://localhost:8000`
- Check browser console for errors
- Verify you're logged in
- Check API endpoint: `http://localhost:8000/api/payments/payments/`

### Issue 2: "Failed to create payment"
**Solution:**
- Verify client ID exists
- Check all required fields are filled
- Check browser console for validation errors
- Verify you have permissions

### Issue 3: Can't see "Verify" button
**Solution:**
- Only pending payments show verify button
- Only admins/verifiers can see it
- Check your user role

### Issue 4: Statistics not updating
**Solution:**
- Refresh the page
- Check backend logs
- Verify API endpoint: `http://localhost:8000/api/payments/payments/stats/`

### Issue 5: Empty table
**Solution:**
- Create test payments first
- Check you have permissions to view
- Verify organization membership

---

## 🔍 Browser Console Testing

Open browser console (F12) and check:

### 1. Network Tab:
```
✅ GET /api/payments/payments/ → 200 OK
✅ GET /api/payments/payments/stats/ → 200 OK
✅ POST /api/payments/payments/ → 201 Created
✅ POST /api/payments/payments/{id}/verify/ → 200 OK
```

### 2. Console Tab:
- No red errors
- API calls successful
- Data loading correctly

---

## 📊 Expected Results

### After Creating 3 Payments (1 Approved, 1 Rejected, 1 Pending):

**Statistics:**
```
Total Payments: 3
Total Amount: $4,500 (or your test amounts)
Pending: 1
Completed: 1
Failed: 1
```

**Table:**
```
Row 1: TXN-TEST-001 | Test Client | $1,500 | Completed | ✓
Row 2: TXN-TEST-002 | Test Client | $2,000 | Failed    | ✓
Row 3: TXN-TEST-003 | Test Client | $1,000 | Pending   | ✗
```

---

## 🎥 Video Testing Checklist

Record or follow these steps:

1. ✅ Page load and initial state
2. ✅ Click "Add Payment"
3. ✅ Fill form and submit
4. ✅ Payment appears in table
5. ✅ Click "Verify" on payment
6. ✅ Approve payment
7. ✅ Status changes to completed
8. ✅ Statistics update
9. ✅ Click eye icon
10. ✅ View payment details
11. ✅ Close dialog
12. ✅ Create another payment
13. ✅ Reject payment
14. ✅ Verify failed status
15. ✅ Refresh page
16. ✅ Data persists

---

## 📝 Test Data Template

Use this for consistent testing:

```json
Payment 1 (To be approved):
{
  "amount": 1500.00,
  "currency": "USD",
  "payment_method": "credit_card",
  "transaction_id": "TXN-TEST-001",
  "notes": "Test payment - will approve"
}

Payment 2 (To be rejected):
{
  "amount": 2000.00,
  "currency": "USD",
  "payment_method": "bank_transfer",
  "transaction_id": "TXN-TEST-002",
  "notes": "Test payment - will reject"
}

Payment 3 (Leave pending):
{
  "amount": 1000.00,
  "currency": "EUR",
  "payment_method": "paypal",
  "transaction_id": "TXN-TEST-003",
  "notes": "Test payment - leave pending"
}
```

---

## 🎯 Success Criteria

Your payment system is working correctly if:

✅ All payments display in table  
✅ Statistics calculate correctly  
✅ Can create payments successfully  
✅ Can verify/reject payments  
✅ Status changes persist  
✅ Details dialog shows all info  
✅ Toast notifications appear  
✅ No console errors  
✅ Data persists after refresh  
✅ Responsive design works  

---

## 📞 Need Help?

If something doesn't work:

1. **Check backend logs** in Terminal 1
2. **Check browser console** (F12)
3. **Verify API endpoints** in Swagger: `http://localhost:8000/swagger/`
4. **Check authentication** - Make sure you're logged in
5. **Verify permissions** - Check your user role

---

## 🎊 You're Ready to Test!

Follow the steps above and verify each feature works as expected.

**Happy Testing! 🧪**
