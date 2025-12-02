import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../lib/next-auth'
import { prisma } from '../../../lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    console.log('🔍 Debug Session:', { 
      hasSession: !!session, 
      user: session?.user 
    })
    
    // Get all users to check if any exist
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true }
    })
    
    return NextResponse.json({
      session: session?.user || null,
      allUsersCount: allUsers.length,
      sampleUsers: allUsers.slice(0, 3) // Show first 3 users for debug
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error }, { status: 500 })
  }
}