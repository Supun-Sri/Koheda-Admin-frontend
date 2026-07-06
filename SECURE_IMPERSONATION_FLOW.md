# Secure Impersonation Flow

## Security Issue: URL Parameters ⚠️

**Problem:** Passing impersonation tokens as URL parameters (`/impersonate?token=xyz`) is **NOT secure**:

- ❌ Stored in browser history
- ❌ Logged in server access logs  
- ❌ Leaked via Referer headers
- ❌ Visible in address bar
- ❌ Can be accidentally shared

## Recommended Solution: HttpOnly Cookies ✅

### Option 1: Same-Domain Setup (Most Secure)

**Setup:**
```
Admin Frontend:  admin.kohedha.com
Vendor Frontend: vendor.kohedha.com  
API Backend:     api.kohedha.com
```

**Flow:**
1. Admin clicks "Impersonate" on admin.kohedha.com
2. Frontend calls `POST /api/admin/vendors/:id/impersonate`
3. Backend sets **HttpOnly cookie** on `.kohedha.com` domain
4. Frontend redirects/opens `vendor.kohedha.com`
5. Cookie automatically sent with all requests
6. Vendor frontend works normally (no special handling needed)

**Backend Cookie Configuration:**
```javascript
res.cookie("impersonation_token", token, {
  httpOnly: true,              // ✅ XSS protection
  secure: true,                 // ✅ HTTPS only
  sameSite: "lax",             // ✅ CSRF protection
  domain: ".kohedha.com",      // ✅ Shared across subdomains
  path: "/",
  maxAge: 3600000              // 1 hour
});
```

**Admin Frontend Code:**
```typescript
const handleImpersonate = async (vendorId: string, reason: string) => {
  try {
    const response = await fetch(
      `${apiUrl}/api/admin/vendors/${vendorId}/impersonate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
        credentials: 'include', // ✅ Important: Send/receive cookies
      }
    );

    if (response.ok) {
      // Cookie is now set by backend
      // Just open the vendor frontend - cookie will be sent automatically
      window.open('https://vendor.kohedha.com/dashboard', '_blank');
    }
  } catch (error) {
    console.error('Impersonation failed:', error);
  }
};
```

**Vendor Frontend Code:**
```typescript
// No special handling needed!
// The impersonation_token cookie is automatically sent with every request

// In your API calls:
fetch('/api/vendor/profile', {
  credentials: 'include'  // ✅ This sends cookies automatically
});

// Backend middleware will detect impersonation from cookie
```

---

### Option 2: Cross-Domain Setup (If Necessary)

**Setup:**
```
Admin Frontend:  localhost:3000 (dev) or admin-domain.com
Vendor Frontend: localhost:3001 (dev) or vendor-domain.com
API Backend:     localhost:5002 (dev) or api-domain.com
```

**Problem:** Cookies cannot be shared across different domains.

**Solution:** Use `postMessage` API for secure cross-origin communication:

#### Step 1: Admin Frontend Opens Vendor Frontend

```typescript
const handleImpersonate = async (vendorId: string, reason: string) => {
  try {
    // Call backend to start impersonation session
    const response = await fetch(
      `${apiUrl}/api/admin/vendors/${vendorId}/impersonate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    const data = await response.json();
    
    if (data.success) {
      // Open vendor frontend in new window
      const vendorWindow = window.open(
        `${vendorFrontendUrl}/impersonate-init`,
        '_blank'
      );

      // Wait for vendor window to be ready, then send token via postMessage
      setTimeout(() => {
        vendorWindow?.postMessage(
          {
            type: 'IMPERSONATION_TOKEN',
            token: data.impersonationToken,
            vendorData: data.data,
          },
          vendorFrontendUrl  // ✅ Only send to specific origin
        );
      }, 1000);
    }
  } catch (error) {
    console.error('Impersonation failed:', error);
  }
};
```

#### Step 2: Vendor Frontend Receives Token

```typescript
// pages/impersonate-init.tsx or similar
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImpersonateInit() {
  const router = useRouter();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // ✅ Verify origin
      if (event.origin !== process.env.NEXT_PUBLIC_ADMIN_URL) {
        console.error('Invalid origin:', event.origin);
        return;
      }

      // ✅ Verify message type
      if (event.data.type === 'IMPERSONATION_TOKEN') {
        // Store token in httpOnly way (via backend call)
        fetch('/api/vendor/set-impersonation-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: event.data.token,
          }),
          credentials: 'include',
        }).then(() => {
          // Redirect to vendor dashboard
          router.push('/dashboard');
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Initializing impersonation session...</div>
    </div>
  );
}
```

#### Step 3: Vendor Backend Sets Cookie

```javascript
// Backend endpoint on vendor API
app.post('/api/vendor/set-impersonation-session', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify token is valid
    const decoded = jwt.verify(token, process.env.IMPERSONATION_JWT_SECRET);
    
    // Set as httpOnly cookie
    res.cookie('impersonation_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});
```

---

### Option 3: Temporary One-Time Code (Most Secure for Cross-Domain)

Instead of passing the full JWT, use a short-lived one-time code:

#### Backend: Generate One-Time Code

```javascript
// When admin starts impersonation
export const startImpersonation = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const jti = uuidv4();
    const token = generateImpersonationToken(vendor._id, req.admin._id, jti);
    const { exp } = jwt.decode(token);

    // Create session
    await ImpersonationSession.create({
      jti,
      adminId: req.admin._id,
      vendorId: vendor._id,
      expiresAt: new Date(exp * 1000),
    });

    // Generate ONE-TIME code (expires in 30 seconds)
    const oneTimeCode = uuidv4();
    await redis.setex(
      `impersonation:${oneTimeCode}`,
      30,  // 30 second expiry
      token
    );

    res.json({
      success: true,
      oneTimeCode,  // ✅ Safe to pass in URL (single-use, short-lived)
      data: { _id: vendor._id, email: vendor.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

#### Vendor Frontend: Exchange Code for Token

```typescript
// pages/impersonate.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ImpersonatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      router.push('/');
      return;
    }

    // Exchange one-time code for session
    fetch('/api/vendor/impersonate/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      credentials: 'include',
    }).then(async (res) => {
      if (res.ok) {
        // Token now set as httpOnly cookie
        router.push('/dashboard');
      } else {
        const error = await res.json();
        alert(error.message || 'Invalid or expired code');
        router.push('/');
      }
    });
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Setting up impersonation session...</div>
    </div>
  );
}
```

#### Backend: Exchange Code for Token

```javascript
app.post('/api/vendor/impersonate/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Get token from Redis (one-time use)
    const token = await redis.get(`impersonation:${code}`);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired code',
      });
    }

    // Delete code immediately (single-use)
    await redis.del(`impersonation:${code}`);

    // Verify token
    const decoded = jwt.verify(token, process.env.IMPERSONATION_JWT_SECRET);

    // Set as httpOnly cookie
    res.cookie('impersonation_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600000,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});
```

**Admin Frontend:**
```typescript
const handleImpersonate = async (vendorId: string) => {
  const response = await fetch(`/api/admin/vendors/${vendorId}/impersonate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });

  const data = await response.json();
  
  if (data.success) {
    // ✅ Safe to pass code in URL (single-use, 30 second expiry)
    window.open(
      `${vendorFrontendUrl}/impersonate?code=${data.oneTimeCode}`,
      '_blank'
    );
  }
};
```

---

## Comparison Table

| Method | Security | Cross-Domain | Complexity | Recommended |
|--------|----------|--------------|------------|-------------|
| **HttpOnly Cookie (Same Domain)** | ⭐⭐⭐⭐⭐ | ❌ No | ⭐ Low | ✅ Best |
| **postMessage** | ⭐⭐⭐⭐ | ✅ Yes | ⭐⭐⭐ Medium | ✅ Good |
| **One-Time Code** | ⭐⭐⭐⭐⭐ | ✅ Yes | ⭐⭐⭐⭐ High | ✅ Best for cross-domain |
| **URL Parameter (JWT)** | ⭐ Very Low | ✅ Yes | ⭐ Low | ❌ **Never use** |

---

## Recommendation

For your setup:

### Development (localhost)
Use **Option 3: One-Time Code** since admin and vendor frontends are on different ports.

### Production (Same Root Domain)
Use **Option 1: HttpOnly Cookie with Subdomains**:
- Admin: `admin.kohedha.com`
- Vendor: `vendor.kohedha.com`
- API: `api.kohedha.com`
- Cookie Domain: `.kohedha.com`

### Production (Different Domains)
Use **Option 3: One-Time Code** with Redis for best security.

---

## Implementation Checklist

- [ ] Choose deployment architecture (subdomains vs different domains)
- [ ] Implement one-time code system (if cross-domain)
- [ ] Update admin frontend to use secure method
- [ ] Create vendor frontend impersonation init page
- [ ] Test cookie propagation
- [ ] Verify token is not in URL/history
- [ ] Test expiration (30 seconds for code, 1 hour for session)
- [ ] Test concurrent sessions
- [ ] Test force-end from admin panel

---

**Current Status:** ⚠️ Backend sets httpOnly cookie correctly, but frontend may be using URL parameters. Update frontend to use recommended approach.

