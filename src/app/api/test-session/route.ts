import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../lib/next-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('=== TEST SESSION DEBUG ===')
    console.log('Session:', JSON.stringify(session, null, 2))
    console.log('Headers:', Object.fromEntries(request.headers.entries()))
    console.log('========================')
    
    return NextResponse.json({
      success: true,
      session: session,
      hasUser: !!session?.user,
      userRole: session?.user?.role,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test session error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}