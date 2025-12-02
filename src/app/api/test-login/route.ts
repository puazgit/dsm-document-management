import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'
import { verifyPassword } from '../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔍 Login attempt:', { email })
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        isActive: true
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
    
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`
      }
    })
    
  } catch (error) {
    console.error('Login test error:', error)
    return NextResponse.json({ error: 'Login test failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        isActive: true
      }
    })
    
    return NextResponse.json({
      message: 'Available users for testing',
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        isActive: u.isActive
      }))
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
  }
}