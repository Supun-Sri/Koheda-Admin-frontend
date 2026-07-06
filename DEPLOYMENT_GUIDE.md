# Deployment Guide: Secure Impersonation Setup

## Overview

The impersonation system uses **HttpOnly cookies** for maximum security. The setup varies between development and production.

---

## Development Setup (localhost)

### Challenge
- Admin: `localhost:3000`
- Vendor: `localhost:3001`
- Backend: `localhost:5002`

**Problem:** Browsers treat different ports as different origins. Cookies cannot be shared.

### Solution Options

#### Option A: Use Same Port with Path-Based Routing (Recommended)

Run both admin and vendor frontends through a reverse proxy on the same port:

```nginx
# nginx.conf
server {
    listen 3000;
    
    location /admin {
        proxy_pass http://localhost:3001;  # Admin frontend
    }
    
    location /vendor {
        proxy_pass http://localhost:3002;  # Vendor frontend
    }
    
    location /api {
        proxy_pass http://localhost:5002;  # Backend API
    }
}
```

Then access:
- Admin: `http://localhost:3000/admin`
- Vendor: `http://localhost:3000/vendor`
- API: `http://localhost:3000/api`

Cookies work because everything is on `localhost:3000`.

#### Option B: Use 127.0.0.1 with Different Subdomains (Hosts File)

Edit your `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1  admin.local
127.0.0.1  vendor.local
127.0.0.1  api.local
```

Update your frontends to use these domains:

**Admin Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://api.local:5002
NEXT_PUBLIC_VENDOR_URL=http://vendor.local:3001
```

**Vendor Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://api.local:5002
```

**Backend (.env):**
```env
COOKIE_DOMAIN=.local
```

Then access:
- Admin: `http://admin.local:3000`
- Vendor: `http://vendor.local:3001`
- API: `http://api.local:5002`

Cookies are shared across `*.local` domains.

#### Option C: Run Everything Through One Next.js Server (Simplest)

Create API routes in your admin Next.js app that proxy to the backend:

```typescript
// app/api/admin/vendors/[id]/impersonate/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = request.headers.get('authorization');
  const body = await request.json();

  const response = await fetch(
    `http://localhost:5002/api/admin/vendors/${params.id}/impersonate`,
    {
      method: 'POST',
      headers: {
        'Authorization': token!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();
  const result = new Response(JSON.stringify(data), {
    status: response.status,
  });

  // Forward the cookie from backend
  const cookie = response.headers.get('set-cookie');
  if (cookie) {
    result.headers.set('set-cookie', cookie);
  }

  return result;
}
```

Then your frontend calls `/api/admin/vendors/${id}/impersonate` instead of the backend directly.

---

## Production Setup

### Recommended Architecture

Use **subdomains** under the same root domain:

```
https://admin.kohedha.com    → Admin Frontend (Next.js)
https://vendor.kohedha.com   → Vendor Frontend (Next.js)
https://api.kohedha.com      → Backend API (Node.js/Express)
```

### DNS Configuration

Add A or CNAME records:

```
admin.kohedha.com   → Your server IP or CDN
vendor.kohedha.com  → Your server IP or CDN
api.kohedha.com     → Your server IP
```

### SSL Certificates

Get wildcard SSL or individual certificates:

```bash
# Using Let's Encrypt (certbot)
certbot certonly --dns-cloudflare \
  -d kohedha.com \
  -d *.kohedha.com
```

### Backend Configuration

**Production .env:**
```env
NODE_ENV=production
PORT=5002

# Cookie domain for sharing across subdomains
COOKIE_DOMAIN=.kohedha.com

# JWT Secrets (use strong random values)
ADMIN_JWT_SECRET=<generate-strong-secret>
IMPERSONATION_JWT_SECRET=<generate-different-strong-secret>

# MongoDB
MONGODB_URI=mongodb://your-production-db-url

# CORS
CORS_ORIGIN=https://admin.kohedha.com,https://vendor.kohedha.com
```

### Frontend Configuration

**Admin Frontend (.env.production):**
```env
NEXT_PUBLIC_API_URL=https://api.kohedha.com
NEXT_PUBLIC_VENDOR_URL=https://vendor.kohedha.com
```

**Vendor Frontend (.env.production):**
```env
NEXT_PUBLIC_API_URL=https://api.kohedha.com
NEXT_PUBLIC_ADMIN_URL=https://admin.kohedha.com
```

### CORS Setup (Backend)

```javascript
// app.js
import cors from 'cors';

const corsOptions = {
  origin: [
    'https://admin.kohedha.com',
    'https://vendor.kohedha.com',
  ],
  credentials: true, // ✅ Important: Allow cookies
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### Nginx Reverse Proxy (Optional)

If using Nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/kohedha

# Admin Frontend
server {
    listen 443 ssl http2;
    server_name admin.kohedha.com;

    ssl_certificate /etc/letsencrypt/live/kohedha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kohedha.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Vendor Frontend
server {
    listen 443 ssl http2;
    server_name vendor.kohedha.com;

    ssl_certificate /etc/letsencrypt/live/kohedha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kohedha.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 443 ssl http2;
    server_name api.kohedha.com;

    ssl_certificate /etc/letsencrypt/live/kohedha.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kohedha.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Testing the Cookie Flow

### 1. Start Impersonation (Admin Frontend)

```bash
# Browser DevTools → Network Tab → Impersonate Request
POST https://api.kohedha.com/api/admin/vendors/123/impersonate

Response Headers:
Set-Cookie: impersonation_token=eyJhbG...; 
            Domain=.kohedha.com; 
            Path=/; 
            HttpOnly; 
            Secure; 
            SameSite=Lax
```

### 2. Open Vendor Dashboard

```bash
# Admin opens vendor.kohedha.com/dashboard
# Browser automatically sends cookie:

GET https://vendor.kohedha.com/dashboard

Request Headers:
Cookie: impersonation_token=eyJhbG...
```

### 3. Verify Cookie in Browser

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to **Application** → **Cookies**
3. Select `https://vendor.kohedha.com`
4. Look for `impersonation_token` cookie
5. Verify:
   - ✅ `Domain`: `.kohedha.com`
   - ✅ `HttpOnly`: Yes
   - ✅ `Secure`: Yes
   - ✅ `SameSite`: Lax

**Firefox DevTools:**
1. Open DevTools (F12)
2. Go to **Storage** → **Cookies**
3. Select `https://vendor.kohedha.com`
4. Check `impersonation_token` details

---

## Security Checklist

### Development
- [ ] Cookie domain NOT set (localhost doesn't support domain attribute)
- [ ] `secure: false` (HTTP allowed for localhost)
- [ ] `sameSite: 'lax'`
- [ ] `httpOnly: true`

### Production
- [ ] Cookie domain set to `.yourdomain.com`
- [ ] `secure: true` (HTTPS only)
- [ ] `sameSite: 'lax'` or `'strict'`
- [ ] `httpOnly: true`
- [ ] CORS configured correctly
- [ ] SSL certificates valid
- [ ] All subdomains on HTTPS

---

## Troubleshooting

### Cookie Not Being Set

**Symptom:** After impersonation call, no cookie appears in browser

**Check:**
1. Response has `Set-Cookie` header (Network tab)
2. `credentials: 'include'` in fetch call
3. CORS allows credentials
4. Domain matches (or omitted for localhost)

**Solution:**
```typescript
// Frontend
fetch(url, {
  credentials: 'include', // ✅ Add this
  // ...
});

// Backend CORS
app.use(cors({
  origin: 'https://admin.kohedha.com',
  credentials: true, // ✅ Add this
}));
```

### Cookie Not Being Sent

**Symptom:** Vendor frontend doesn't receive impersonation cookie

**Check:**
1. Cookie domain includes vendor subdomain
2. Cookie `path` is `/` (not restricted)
3. Vendor frontend uses `credentials: 'include'`

**Solution:**
```env
# Backend .env
COOKIE_DOMAIN=.kohedha.com  # ✅ Dot prefix for subdomains
```

### "SameSite" Warning

**Symptom:** Browser console shows SameSite warning

**Explanation:** Modern browsers require `SameSite` attribute

**Solution:**
```javascript
res.cookie('impersonation_token', token, {
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  secure: process.env.NODE_ENV === 'production', // Required with SameSite=None
  // ...
});
```

### Cross-Origin Cookie Blocked

**Symptom:** "Cookie blocked due to cross-origin" in console

**Cause:** Different domains without proper setup

**Solution:** Use subdomains (recommended) or implement one-time code exchange

---

## Summary

| Environment | Setup | Cookie Domain | Secure Flag |
|-------------|-------|---------------|-------------|
| **Development** | localhost:XXXX | Not set | false |
| **Development (Hosts)** | *.local | `.local` | false |
| **Production** | *.yourdomain.com | `.yourdomain.com` | true |

**Best Practice:** Always use subdomains in production for secure, simple cookie sharing.

