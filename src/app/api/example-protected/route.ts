/**
 * Example: Protected API Route using Unified Access Control
 * 
 * GET /api/example-protected
 * 
 * This demonstrates how to protect API routes using the unified RBAC system
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAPIProtection } from '@/lib/api-protection'

export const GET = withAPIProtection('/api/users', 'GET', async (req, session) => {
  // User is authorized, proceed with handler
  // session contains the authenticated user information
  
  return NextResponse.json({
    message: 'Access granted',
    user: session.user,
    timestamp: new Date().toISOString(),
  })
})

// Alternative pattern using protectAPI directly:
// export async function GET(req: NextRequest) {
//   const accessCheck = await protectAPI(req, '/api/users', 'GET')
//   if (accessCheck) return accessCheck
//   
//   // User is authorized, proceed with handler
//   return NextResponse.json({ message: 'Access granted' })
// }
