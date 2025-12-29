import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasRoleAccess, normalizeRoleName } from '@/config/roles'

/**
 * Protected routes mapped to their required roles/groups
 * Format: route -> array of role names that can access
 * 
 * Note: Uses centralized role configuration from /config/roles.ts
 * Role hierarchy is automatically handled (higher level roles inherit lower level access)
 */
const protectedRoutes: Record<string, string[]> = {
  '/admin': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/users': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/groups': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/roles': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/permissions': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/settings': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/analytics': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit', 'manager', 'kadiv'],
  '/admin/audit-logs': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/pdf-permissions': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],

  '/documents/upload': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit', 'kadiv', 'manager'],
  '/documents/[id]/edit': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit', 'kadiv'],
  '/documents/[id]/delete': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
}

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/about',
  '/contact',
  '/test',
  '/sidebar-test',
  '/pdf-security-demo',
  '/search',
]

/**
 * API routes are handled separately and skip middleware
 */
const apiRoutes = ['/api']

/**
 * Middleware to enforce role-based access control
 * 
 * Flow:
 * 1. Skip static files, API routes
 * 2. Allow public routes
 * 3. Verify user is authenticated
 * 4. Check if user's role is authorized for the route
 * 
 * Role validation:
 * - Uses centralized role configuration from /config/roles.ts
 * - Supports role hierarchy (higher level roles inherit lower level access)
 * - Handles role name normalization (case-insensitive, aliases)
 * 
 * Note: session.user.role contains the GROUP NAME which acts as the ROLE
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    apiRoutes.some(route => pathname.startsWith(route))
  ) {
    return NextResponse.next()
  }

  // Allow public routes without authentication
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Get the user token from JWT
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Redirect to login if user is not authenticated
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access for protected routes
  for (const [route, requiredRoles] of Object.entries(protectedRoutes)) {
    // Convert route pattern to regex (e.g., /documents/[id]/edit -> /documents/[^/]+/edit)
    const routePattern = route.replace(/\[.*?\]/g, '[^/]+')
    const routeRegex = new RegExp(`^${routePattern}$`)

    // Check if current pathname matches this protected route
    if (routeRegex.test(pathname)) {
      // Get and normalize user's role
      const userRole = normalizeRoleName(token.role as string || '')
      
      if (!userRole) {
        console.warn(`[Middleware] Invalid role for user ${token.sub}: ${token.role}`)
        const unauthorizedUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(unauthorizedUrl)
      }
      
      // Use centralized role hierarchy checking
      const hasAccess = hasRoleAccess(userRole, requiredRoles)

      if (!hasAccess) {
        // Log unauthorized access attempt with better context
        console.warn(
          `[Middleware] Unauthorized access attempt`,
          {
            userId: token.sub,
            userRole,
            requiredRoles,
            pathname,
            timestamp: new Date().toISOString()
          }
        )

        // Redirect to unauthorized page
        const unauthorizedUrl = new URL('/unauthorized', request.url)
        return NextResponse.redirect(unauthorizedUrl)
      }
      
      break // Found matching route, no need to check others
    }
  }

  // Add enhanced security headers to all responses
  const response = NextResponse.next()
  
  // Basic security headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'same-origin')
  
  // PDF-specific security for document routes
  if (pathname.includes('/documents') || pathname.includes('/api/documents/')) {
    response.headers.set('X-PDF-Protection', 'role-based')
    response.headers.set('X-Download-Control', 'authorized-only')
    
    // Enhanced cache control for PDF viewing
    if (pathname.includes('/view')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
      response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet, noimageindex')
    }
  }
  
  // Enhanced permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  )

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}