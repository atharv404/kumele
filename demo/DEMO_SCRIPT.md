# 🎯 Kumele Stripe Escrow Demo Script

> **Duration:** 5-7 minutes  
> **Date:** February 4, 2026  
> **API:** https://kumele-api-37cf.onrender.com  
> **Swagger:** https://kumele-api-37cf.onrender.com/docs  

---

## ⚡ QUICK REFERENCE - Stripe Dashboard URLs (Test Mode)

| Page | URL | What to Show |
|------|-----|--------------|
| **Payments** | https://dashboard.stripe.com/test/payments | See payment holds |
| **Transfers** | https://dashboard.stripe.com/test/connect/transfers | See payouts to hosts |
| **Customers** | https://dashboard.stripe.com/test/customers | See demo user |
| **Webhooks** | https://dashboard.stripe.com/test/webhooks | See webhook logs |
| **Logs** | https://dashboard.stripe.com/test/logs | Real-time API calls |

**Filters to Set:**
- Date: "Today"
- Status: "All" (to show both succeeded and pending)

---

## 🚀 PRE-DEMO SETUP (5 minutes before)

### Wake Up the Backend
```bash
# Run this 5 minutes before demo to wake Render from sleep
curl https://kumele-api-37cf.onrender.com/health
```

### Have These Ready:
1. ✅ Postman - Open with Kumele collection loaded
2. ✅ Browser Tab 1 - Stripe Dashboard (Payments page)
3. ✅ Browser Tab 2 - Stripe Dashboard (Transfers page)
4. ✅ Browser Tab 3 - Swagger UI at /docs (backup)

---

## 📖 DEMO SCRIPT

---

### STEP 0: Introduction (15 seconds)
**🎤 SAY:**
> "Let me walk you through our Stripe escrow payment flow. This protects both users AND hosts - money is held safely until the event is completed successfully."

---

### STEP 1: Health Check (10 seconds)

**📍 POSTMAN: Click "0️⃣ Health Check"**

**🎤 SAY:**
> "First, let me verify our backend is live on the cloud..."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T..."
}
```

**🎤 SAY:**
> "Backend is running. Now let me login as a demo user..."

---

### STEP 2: Login as User (15 seconds)

**📍 POSTMAN: Click "1️⃣ Login as User"**

**🎤 SAY:**
> "I'm logging in as a regular user who wants to join an event..."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": {
    "email": "user-demo@kumele.com",
    "displayName": "Demo User"
  }
}
```

**🎤 SAY:**
> "Notice the JWT token was automatically saved by Postman. All subsequent requests will use this token for authentication."

**💡 POINT TO:** The `accessToken` field in response

---

### STEP 3: View Event Details (15 seconds)

**📍 POSTMAN: Click "2️⃣ View Demo Event"**

**🎤 SAY:**
> "Now let's look at an event the user wants to join..."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "id": "{{eventId}}",
  "title": "Demo Meditation Workshop",
  "price": 500,
  "currency": "INR",
  "host": {
    "displayName": "Demo Host"
  },
  "status": "ACTIVE"
}
```

**🎤 SAY:**
> "This event costs ₹500 and is hosted by our demo host. Let's join and pay..."

**💡 POINT TO:** 
- `price: 500` (₹500)
- `status: "ACTIVE"`
- Host name

---

### STEP 4: Join Event & Pay (30 seconds) ⭐ KEY STEP

**📍 POSTMAN: Click "3️⃣ Join Event & Pay"**

**🎤 SAY:**
> "Here's where the magic happens. When a user pays, the money goes into ESCROW - it's held securely by Stripe, not released to the host yet."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "pi_...",
    "status": "requires_action"
  },
  "clientSecret": "pi_...secret...",
  "escrow": {
    "status": "HELD",
    "releaseAt": "2026-02-11T..."
  }
}
```

**🎤 SAY:**
> "See the `escrow.status` is 'HELD' - the ₹500 is now safely held. It will only release 7 days after the event ends AND after the user checks in. Let me show you in Stripe..."

**💡 POINT TO:**
- `escrow.status: "HELD"`
- `releaseAt` date (7 days from event end)

---

### STEP 5: Show Stripe Dashboard - Payment Held (20 seconds) ⭐ CRITICAL

**📍 BROWSER: Switch to Stripe Payments tab**

**🎤 SAY:**
> "Now let's look at Stripe's dashboard to verify the payment..."

**👆 NAVIGATE:** https://dashboard.stripe.com/test/payments

**💡 POINT TO:**
1. The payment row showing ₹500 / ₹5.00 (or $5 test amount)
2. Status showing "Succeeded" or "Payment on hold"
3. Click the payment to show details

**🎤 SAY:**
> "Here's the payment. You can see it's captured but not yet transferred to the host. This IS the escrow - Stripe holds it until we explicitly release it."

**💡 INSIDE PAYMENT DETAIL, SHOW:**
- Payment ID (matches API response)
- Amount
- Customer email
- Metadata (eventId, userId if present)

---

### STEP 6: User Checks In at Event (20 seconds)

**📍 POSTMAN: Click "4️⃣ Self Check-in (GPS)"**

**🎤 SAY:**
> "Now the user arrives at the event. They can check in using GPS..."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "success": true,
  "checkin": {
    "method": "SELF_VERIFIED",
    "distanceKm": 0.5,
    "checkedInAt": "2026-02-04T..."
  },
  "escrow": {
    "attendanceVerified": true,
    "status": "HELD"
  }
}
```

**🎤 SAY:**
> "The check-in verified the user is within 2km of the event venue. Notice `attendanceVerified` is now TRUE - this is one of the conditions for escrow release."

**💡 POINT TO:**
- `distanceKm: 0.5` (user is 0.5km from venue)
- `attendanceVerified: true`

---

### STEP 7: Release Escrow to Host (25 seconds) ⭐ KEY STEP

**📍 POSTMAN: Click "5️⃣ Release Escrow"**

**🎤 SAY:**
> "Normally, this happens automatically 7 days after the event. For demo purposes, I'll trigger it manually..."

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "success": true,
  "escrow": {
    "status": "RELEASED",
    "stripeTransferId": "tr_...",
    "releasedAt": "2026-02-04T...",
    "hostPayout": {
      "amount": 450,
      "currency": "INR",
      "platformFee": 50
    }
  }
}
```

**🎤 SAY:**
> "The escrow is now RELEASED. Notice the platform took a 10% fee (₹50), and the host receives ₹450. Let me show you the transfer in Stripe..."

**💡 POINT TO:**
- `status: "RELEASED"`
- `platformFee: 50` (10%)
- `hostPayout.amount: 450`

---

### STEP 8: Show Stripe Dashboard - Transfer to Host (15 seconds)

**📍 BROWSER: Switch to Stripe Transfers tab**

**👆 NAVIGATE:** https://dashboard.stripe.com/test/connect/transfers

**🎤 SAY:**
> "And here in Stripe's transfers page, you can see the actual transfer to the host's connected account..."

**💡 POINT TO:**
1. Transfer row showing the amount
2. Destination (connected account)
3. Click to show transfer details

---

### STEP 9: (Optional) Cancel Event - Refund Flow (30 seconds)

**📍 POSTMAN: Click "6️⃣ Cancel Event (Host)"**

**🎤 SAY:**
> "But what if the host needs to cancel? Let me show you the refund flow..."

**⚠️ FIRST:** Login as Host (use "1️⃣ Login as Host" request)

**👆 CLICK:** Send

**✅ EXPECTED RESPONSE:**
```json
{
  "success": true,
  "cancelled": true,
  "refunds": [
    {
      "userId": "user-001",
      "refundId": "re_...",
      "amount": 500,
      "status": "succeeded"
    }
  ]
}
```

**🎤 SAY:**
> "All users who paid are automatically refunded in full. No action needed from them."

**📍 BROWSER: Show refund in Stripe Payments page**

---

### STEP 10: Conclusion (15 seconds)

**🎤 SAY:**
> "So to summarize the escrow flow:
> 1. **User pays** → Money held in escrow
> 2. **User attends** → Attendance verified via GPS
> 3. **7 days pass** → Escrow automatically releases to host
> 4. **If cancelled** → Automatic full refund
>
> This protects everyone - users know their money is safe, hosts know they'll get paid when they deliver."

---

## 🆘 TROUBLESHOOTING DURING DEMO

### If Backend is Slow (Cold Start)

**🎤 SAY:**
> "The server is just warming up - we use auto-scaling which means it sleeps when not in use to save costs. Give it 10 seconds..."

*Wait for response, then continue*

### If API Returns 401 Unauthorized

**FIX:** Re-run the Login request, then retry

**🎤 SAY:**
> "Let me refresh my authentication token..."

### If Payment Fails

**🎤 SAY:**
> "This is actually a great demo of error handling - you can see our API returns detailed error messages..."

**FIX:** Check request body has correct eventId

### If Stripe Dashboard Doesn't Show Payment

**🎤 SAY:**
> "Stripe has a slight delay in updating - let me refresh..."

**FIX:** Click refresh in Stripe, or check "View test data" toggle is ON

---

## 📊 CLIENT Q&A - PREPARED ANSWERS

### Q: "What happens if the user doesn't show up?"

**ANSWER:**
> "If the user doesn't check in, the `attendanceVerified` flag stays false. The escrow will NOT release to the host. After 30 days, our system flags it for manual review. We can either:
> 1. Release to host (if no-show was user's fault)
> 2. Refund to user (if event had issues)
> This is handled case-by-case by our admin team."

### Q: "What about Stripe fees?"

**ANSWER:**
> "Stripe charges approximately 2.9% + $0.30 per transaction. We absorb this into our 10% platform fee. So:
> - User pays: ₹500
> - Stripe takes: ~₹18 (2.9%)
> - Platform takes: ₹50 (10%)
> - Host receives: ₹432-450
>
> All this is transparent in our host dashboard."

### Q: "Can the host withdraw money before 7 days?"

**ANSWER:**
> "No, and this is intentional. The 7-day hold period allows time for:
> 1. Users to report issues
> 2. Dispute resolution
> 3. Preventing fraud
>
> However, hosts with a verified track record (Gold badge) can qualify for expedited 3-day releases in future versions."

### Q: "What if the payment fails?"

**ANSWER:**
> "If payment fails, the user's spot is NOT confirmed. They have 15 minutes to retry with a different payment method. After that, their reservation expires and the spot opens for others."

### Q: "How do you handle disputes?"

**ANSWER:**
> "Disputes go through 3 levels:
> 1. **Automatic** - Clear cases (no-show) resolved by system
> 2. **Admin Review** - Our team reviews within 48 hours
> 3. **Escalation** - Complex cases escalated with Stripe's dispute resolution
>
> During disputes, escrow is frozen until resolved."

### Q: "Why aren't you showing the database?"

**ANSWER:**
> "Great question! The database contains sensitive user information (PII). For demos, we verify functionality through:
> 1. API responses (what users/devs see)
> 2. Stripe Dashboard (source of truth for payments)
>
> This actually mirrors real production - even our team accesses data through APIs, not direct DB queries."

---

## 📋 PRE-DEMO CHECKLIST

### 30 Minutes Before

- [ ] Run `curl https://kumele-api-37cf.onrender.com/health` to wake backend
- [ ] Open Postman with Kumele collection
- [ ] Open Stripe Dashboard (logged in, test mode)
- [ ] Clear old test data from Stripe if needed
- [ ] Test login request works

### 5 Minutes Before

- [ ] Hit health endpoint again (ensure warm)
- [ ] Arrange windows: Postman left, Stripe right
- [ ] Set Stripe filters: Today, All statuses
- [ ] Clear any previous {{accessToken}} in Postman

### During Demo

- [ ] Watch for slow responses (cold start)
- [ ] If error, stay calm, explain, and retry
- [ ] Point to specific fields in responses
- [ ] Switch to Stripe at key moments

### After Demo

- [ ] Offer to show Swagger docs if asked
- [ ] Share Postman collection link if requested
- [ ] Note any client questions for follow-up

---

## 🔗 SHAREABLE LINKS

| Resource | Link |
|----------|------|
| API Base | https://kumele-api-37cf.onrender.com |
| Swagger Docs | https://kumele-api-37cf.onrender.com/docs |
| Postman Collection | *Use the JSON file in `/postman` folder* |

---

## 🧪 TEST CARD NUMBERS

| Scenario | Card Number | Expiry | CVC |
|----------|-------------|--------|-----|
| Success | 4242 4242 4242 4242 | 12/28 | 123 |
| Decline | 4000 0000 0000 0002 | 12/28 | 123 |
| 3D Secure | 4000 0025 0000 3155 | 12/28 | 123 |

---

**Good luck with your demo! 🚀**
