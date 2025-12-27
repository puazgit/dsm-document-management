/**
 * API Access Control Middleware
 * 
 * Reusable helper for protecting API routes with capability-based access control
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { canAccessAPI } from '@/lib/unified-access-control'

/**
 * Protect an API route with capability checking
 * 
 * Usage in API route:
 * ```ts
 * export async function GET(req: NextRequest) {
 *   const accessCheck = await protectAPI(req, '/api/users', 'GET')
 *   if (accessCheck) return accessCheck // Returns error response if unauthorized
 *   
 *   // User is authorized, proceed with handler
 *   // ...
 * }
 * ```
 */
export async function protectAPI(
  req: NextRequest,
  apiPath: string,
  method: string
): Promise<NextResponse | null> {
  // Get current session
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Check if user can access this API
  const hasAccess = await canAccessAPI(session.user.id, apiPath, method)
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden - Insufficient permissions' },
      { status: 403 }
    )
  }
  
  // Access granted
  return null
}

/**
 * Higher-order function to wrap API route handlers with access control
 * 
 * Usage:
 * ```ts
 * export const GET = withAPIProtection('/api/users', 'GET', async (req, session) => {
 *   // Handler logic here
 *   return NextResponse.json({ users: [] })
 * })
 * ```
 */
export function withAPIProtection(
  apiPath: string,
  method: string,
  handler: (req: NextRequest, session: any) => Promise<NextResponse>
) {
  return async function (req: NextRequest) {
    // Get current session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check if user can access this API
    const hasAccess = await canAccessAPI(session.user.id, apiPath, method)
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }
    
    // Call the actual handler
    return handler(req, session)
  }
}
