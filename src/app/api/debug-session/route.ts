import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Get user details from database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        },
        group: true
      }
    })

    // Get all roles from database for reference
    const allRoles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        displayName: true
      }
    })

    return NextResponse.json({
      sessionUser: session.user,
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        userRoles: dbUser.userRoles.map(ur => ({
          id: ur.id,
          role: ur.role
        })),
        group: dbUser.group
      } : null,
      allRoles
    })
  } catch (error) {
    console.error('Debug session error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}