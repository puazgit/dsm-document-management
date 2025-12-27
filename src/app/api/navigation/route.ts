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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get navigation for user
    const navigation = await getNavigationForUser(session.user.id)
    
    return NextResponse.json({ navigation })
  } catch (error) {
    console.error('Error fetching navigation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
