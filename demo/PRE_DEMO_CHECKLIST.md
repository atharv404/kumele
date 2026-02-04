# ✅ Pre-Demo Checklist

## 30 Minutes Before Demo

### Environment Setup
- [ ] **Wake up backend:** `curl https://kumele-api-37cf.onrender.com/health`
- [ ] **Verify response:** `{"status":"ok"}`
- [ ] **Check demo data:** `curl https://kumele-api-37cf.onrender.com/api/v1/dev/check`
- [ ] **Seed if needed:** `POST /api/v1/dev/seed`

### Postman Setup
- [ ] Open Postman desktop app (NOT browser version)
- [ ] Import `Kumele_Escrow_Demo.postman_collection.json`
- [ ] Verify `baseUrl` = `https://kumele-api-37cf.onrender.com`
- [ ] Clear any old `accessToken` values
- [ ] Test "0️⃣ Wake Up Backend" request

### Stripe Setup
- [ ] Login to https://dashboard.stripe.com
- [ ] **CRITICAL:** Toggle "Viewing test data" ON (top right)
- [ ] Go to Payments page: https://dashboard.stripe.com/test/payments
- [ ] Set date filter to "Today"
- [ ] Open Transfers page in new tab: https://dashboard.stripe.com/test/connect/transfers

### Browser Tabs (Left to Right)
1. Postman (main demo tool)
2. Stripe Payments
3. Stripe Transfers
4. Swagger Docs (backup): https://kumele-api-37cf.onrender.com/docs

---

## 5 Minutes Before Demo

### Quick Verification
- [ ] **Ping backend again:** Health check should respond < 1 second
- [ ] **Run login:** Verify token is returned
- [ ] **Check event:** Verify Demo Meditation Workshop exists

### Screen Setup
- [ ] Hide any sensitive tabs/apps
- [ ] Close email/chat notifications
- [ ] Set Postman to full screen
- [ ] Position Stripe tab for easy switch

### Start Background Ping (Optional)
```powershell
# Run in separate terminal to keep backend warm
while ($true) { 
    Invoke-WebRequest -Uri "https://kumele-api-37cf.onrender.com/health" -UseBasicParsing | Out-Null
    Start-Sleep -Seconds 120 
}
```

---

## During Demo - Watch For

### Response Times
- [ ] If > 5 seconds: "Server is processing..." (stay calm)
- [ ] If timeout: "Let me retry that..." (click Send again)

### Token Issues
- [ ] If 401: Re-run login request
- [ ] If token empty: Check Test script ran correctly

### Stripe Sync
- [ ] If payment not showing: Refresh Stripe page
- [ ] If still not showing: Check test mode toggle

---

## Demo Flow Sequence

```
0️⃣ Health Check    → "Backend is live"
1️⃣ Seed Data       → "Creating test data" (if needed)
2️⃣ Login User      → "Logging in as a user"
3️⃣ View Event      → "Here's the event - ₹500"
4️⃣ Join Event      → "Reserving their spot"
5️⃣ Create Payment  → "Payment goes to escrow"
   ↳ SWITCH TO STRIPE → "See it in Stripe!"
6️⃣ Self Check-in   → "User arrives, checks in"
7️⃣ Escrow Status   → "Attendance verified"
   ↳ (Optional) Cancel → "Show refund flow"
```

---

## Key Talking Points

### At Payment Step (Step 5)
> "See the `escrow.status` is 'HELD' - the money is now safely held by Stripe. It will only release after:
> 1. The event ends
> 2. The user checks in
> 3. 7 days pass with no disputes"

### At Stripe Dashboard
> "Here in Stripe's dashboard, you can see the actual payment. It's captured but NOT transferred to the host yet. This IS the escrow."

### At Check-in Step (Step 6)
> "The GPS check-in verifies the user is actually at the venue. This prevents fraud - you can't claim attendance without being there."

### At Escrow Release
> "Now the conditions are met - event ended, user attended. The escrow releases automatically. 10% goes to the platform, 90% to the host."

---

## After Demo

### Cleanup
- [ ] Ask if client wants to see Swagger docs
- [ ] Offer to share Postman collection
- [ ] Run: `DELETE /api/v1/dev/seed` to clean up

### Follow-up
- [ ] Note any questions that need research
- [ ] Send Postman collection if requested
- [ ] Send Swagger URL if requested

### Code Cleanup (Later)
- [ ] Remove `DevModule` from `app.module.ts`
- [ ] Delete `src/modules/dev/` folder
- [ ] Commit & push

---

## Quick Reference URLs

| Resource | URL |
|----------|-----|
| API Health | https://kumele-api-37cf.onrender.com/health |
| Swagger Docs | https://kumele-api-37cf.onrender.com/docs |
| Stripe Payments | https://dashboard.stripe.com/test/payments |
| Stripe Transfers | https://dashboard.stripe.com/test/connect/transfers |
| Stripe Webhooks | https://dashboard.stripe.com/test/webhooks |

---

## Test Card Numbers

| Scenario | Number | Expiry | CVC |
|----------|--------|--------|-----|
| ✅ Success | 4242 4242 4242 4242 | 12/28 | 123 |
| ❌ Decline | 4000 0000 0000 0002 | 12/28 | 123 |
| 🔒 3D Secure | 4000 0025 0000 3155 | 12/28 | 123 |

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| User | user-demo@kumele.com | Demo@1234 |
| Host | host-demo@kumele.com | Demo@1234 |
| Admin | admin-demo@kumele.com | Demo@1234 |

**Event ID:** `event-demo-001`  
**Event Title:** Demo Meditation Workshop  
**Event Price:** ₹500

---

**Good luck! You've got this! 🚀**
