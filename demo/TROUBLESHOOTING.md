# 🆘 Troubleshooting Guide - Kumele Escrow Demo

## Quick Fixes

| Problem | Fix |
|---------|-----|
| Backend slow/timeout | Wait 30-60s (cold start) - say "Server is warming up" |
| 401 Unauthorized | Re-run Login request, then retry |
| 404 Not Found | Check eventId is `event-demo-001` |
| 500 Internal Error | Run "Seed Demo Data" again |
| Stripe not showing payment | Refresh page, check "Test mode" is ON |

---

## 🐌 Problem: Backend Takes 30-60 Seconds

**Cause:** Render.com free tier sleeps after 15 minutes of inactivity.

**Prevention:**
```bash
# Run 5 minutes before demo
curl https://kumele-api-37cf.onrender.com/health
```

**During Demo:**
> "The server is just warming up - we use auto-scaling which means it sleeps when not in use to save costs. This is normal for cloud deployments. Give it a moment..."

**Background Ping Script:**
```powershell
# Keep backend warm during demo (run in separate terminal)
while ($true) { 
    Invoke-WebRequest -Uri "https://kumele-api-37cf.onrender.com/health" -UseBasicParsing | Out-Null
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Ping!"
    Start-Sleep -Seconds 120 
}
```

---

## 🔐 Problem: 401 Unauthorized

**Cause:** JWT token expired or not saved.

**Fix:**
1. Run "2️⃣ Login as User" request again
2. Check that `accessToken` was saved in collection variables
3. Retry the failed request

**Say to Client:**
> "Let me refresh my authentication token..."

---

## 🔍 Problem: 404 Not Found

**Cause:** Demo data doesn't exist or wrong ID.

**Fix:**
1. Run "1️⃣ Seed Demo Data" to create test data
2. Check that `eventId` is set to `event-demo-001`

**Verify:**
```
GET {{baseUrl}}/api/v1/dev/check
```

---

## 💥 Problem: 500 Internal Server Error

**Cause:** Database issue or missing data.

**Fix:**
1. Run "Delete Demo Data" 
2. Run "Seed Demo Data" again
3. Retry

**If persists:** Switch to Swagger UI and show API structure instead.

---

## 💳 Problem: Stripe Dashboard Empty

**Cause:** Test mode not selected, or different Stripe account.

**Fix:**
1. Click "Viewing test data" toggle in Stripe (top right)
2. Check date filter is set to "Today"
3. Refresh the page

**URL:** https://dashboard.stripe.com/test/payments

---

## 🔄 Problem: Escrow Not Created

**Cause:** Payment intent not completed, or event already joined.

**Fix:**
1. Delete demo data
2. Re-seed
3. Follow exact sequence: Login → Join → Pay

---

## 📍 Problem: Check-in Failed (Distance)

**Cause:** GPS coordinates too far from venue.

**Fix:** Use these coordinates (within 1km of demo venue):
```json
{
  "guestLat": 19.0600,
  "guestLng": 72.8660
}
```

---

## 🌐 Problem: CORS Error

**Cause:** Browser security blocking request.

**Fix:** Use Postman desktop app (not browser) for demo.

---

## ⚡ Emergency Backup Plans

### Plan B: Show Swagger UI
If API is completely down:
1. Open https://kumele-api-37cf.onrender.com/docs
2. Walk through the API structure
3. Explain each endpoint's purpose

**Say:**
> "Let me show you our API documentation instead..."

### Plan C: Show Code
If everything fails:
1. Open VS Code with the project
2. Show the escrow.service.ts file
3. Walk through the code logic

**Say:**
> "Let me show you how the escrow logic is implemented in the code..."

### Plan D: Diagram
Draw or show this flow:
```
User Pays → Stripe Captures → Money Held (7 days) → Event Ends → Check-in Verified → Escrow Released → Host Gets Paid
```

---

## 🔧 Pre-Demo Verification Commands

```bash
# 1. Wake up backend
curl https://kumele-api-37cf.onrender.com/health

# 2. Check demo data exists
curl https://kumele-api-37cf.onrender.com/api/v1/dev/check

# 3. Create demo data if missing
curl -X POST https://kumele-api-37cf.onrender.com/api/v1/dev/seed

# 4. Test login
curl -X POST https://kumele-api-37cf.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user-demo@kumele.com","password":"Demo@1234"}'
```

---

## 📞 During Demo - Stay Calm

1. **Don't panic** - Technical issues happen
2. **Acknowledge** - "Let me fix that quickly..."
3. **Explain** - What you're doing to fix it
4. **Have backup** - Swagger, code, or diagrams ready
5. **Keep talking** - Fill silence with context about the feature

---

## 🧹 After Demo Cleanup

```bash
# Remove demo data
curl -X DELETE https://kumele-api-37cf.onrender.com/api/v1/dev/seed

# TODO: Remove DevModule from app.module.ts before production!
```

**Files to remove after demo:**
- `src/modules/dev/dev.module.ts`
- `src/modules/dev/dev-seed.controller.ts`
- Remove `DevModule` import from `app.module.ts`
