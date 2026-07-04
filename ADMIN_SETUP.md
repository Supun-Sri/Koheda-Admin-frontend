# Kohedha Admin Frontend

Modern admin portal for the Kohedha platform built with Next.js 16, React 19, and Tailwind CSS 4.

## Features

- ✅ Admin login with JWT authentication
- ✅ Kohedha branding (Yellow #F5E642, Red #C8281A, Dark #0D0D0D)
- ✅ Responsive design
- ✅ Dashboard with stats overview
- ✅ Protected routes
- ✅ Modern UI with smooth transitions

## Getting Started

### Prerequisites

- Node.js 20+ 
- Backend API running on `http://localhost:5000`

### Installation

1. Navigate to the admin frontend directory:
```bash
cd AdminFrontend/adminfrontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
app/
├── login/
│   └── page.tsx          # Login page with authentication
├── dashboard/
│   └── page.tsx          # Admin dashboard (protected)
├── layout.tsx            # Root layout with Poppins font
├── globals.css           # Global styles with Kohedha branding
└── page.tsx              # Redirect to login
```

## Authentication Flow

1. User enters email and password on `/login`
2. Frontend sends POST request to `http://localhost:5000/api/admin/login`
3. Backend validates credentials and returns JWT token
4. Frontend stores token in `localStorage`
5. User is redirected to `/dashboard`
6. Dashboard checks for token on mount, redirects to login if missing

## API Integration

The login page integrates with your backend admin API:

**Endpoint**: `POST /api/admin/login`

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "data": {
    "_id": "admin_id",
    "email": "admin@example.com",
    "name": "Admin Name",
    "role": "super_admin"
  }
}
```

## Environment Variables

Create a `.env.local` file (already created):

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Design System

### Colors

- **Primary Yellow**: #F5E642 (kohedha-yellow)
- **Accent Red**: #C8281A (kohedha-red)
- **Background Dark**: #0D0D0D (kohedha-dark)
- **Gray**: #1a1a1a (kohedha-gray)
- **Light Gray**: #2a2a2a (kohedha-light-gray)

### Typography

- **Font**: Poppins (400, 500, 600, 700, 800)
- **Logo**: Extrabold, large tracking

## Next Steps

1. **Enable CORS in Backend**: Make sure your backend allows requests from `http://localhost:3000`

2. **Test Login**: Use your admin credentials to test the login flow

3. **Add More Pages**: Build out vendor management, deals, events, etc.

4. **Add API Client**: Create a centralized API client with axios

5. **Implement Role-Based Access**: Add permission checks for different admin roles

## Build for Production

```bash
npm run build
npm start
```

## Technologies

- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with improved performance
- **Tailwind CSS 4** - Utility-first CSS framework
- **TypeScript 5** - Type safety
