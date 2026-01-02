import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { getNavigationForUser } from '@/lib/unified-access-control'

/**
 * GET /api/navigation
 * 
 * Returns navigation items visible to the current user
 * based on their role capabilities
 */
export async function GET(req: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('[API /navigation] Unauthorized - no session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    console.log('[API /navigation] Fetching navigation for user:', session.user.email)
    
    // Get navigation for user
    const navigation = await getNavigationForUser(session.user.id)
    
    console.log('[API /navigation] Returning', navigation.length, 'items')
    
    return NextResponse.json(
      { navigation },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    )
  } catch (error) {
    console.error('[API /navigation] Error fetching navigation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
