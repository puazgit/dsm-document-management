import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { verifyPassword } from '../../../lib/auth'

export async function GET(request: NextRequest) {
  // Test with hardcoded admin credentials for debugging
  return POST(request, { email: 'admin@dsm.com', password: 'admin123' })
}

export async function POST(request: NextRequest, testCredentials?: any) {
  try {
    let email, password
    
    if (testCredentials) {
      // Use provided test credentials
      email = testCredentials.email
      password = testCredentials.password
    } else {
      // Parse from request body
      const body = await request.json()
      email = body.email
      password = body.password
    }
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user with group information
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        group: true,
        divisi: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 401 }
      )
    }

    // Return user info for debug purposes
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        groupName: user.group?.name,
        groupId: user.groupId,
        divisiName: user.divisi?.name,
        divisiId: user.divisiId,
        isActive: user.isActive,
      }
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}