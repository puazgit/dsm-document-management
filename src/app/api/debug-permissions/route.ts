import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        capabilities: session.user.capabilities || []
      },
      hasDocumentEditCapability: {
        'DOCUMENT_UPDATE': session.user.capabilities?.includes('DOCUMENT_UPDATE'),
        'DOCUMENT_UPDATE_OWN': session.user.capabilities?.includes('DOCUMENT_UPDATE_OWN'),
        'DOCUMENT_EDIT': session.user.capabilities?.includes('DOCUMENT_EDIT')
      },
      // Legacy permission fields removed - use capabilities instead
      note: 'Migrated to capability-based authorization'
    })
  } catch (error) {
    console.error('Debug permissions error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}