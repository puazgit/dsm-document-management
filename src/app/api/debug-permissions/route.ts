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
        permissions: session.user.permissions || []
      },
      hasDocumentEditPermission: {
        'documents.update': session.user.permissions?.includes('documents.update'),
        'documents.update.own': session.user.permissions?.includes('documents.update.own')
      }
    })
  } catch (error) {
    console.error('Debug permissions error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}