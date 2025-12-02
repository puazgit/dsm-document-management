import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { checkApiPermission } from '@/lib/permissions'
import { auditHelpers } from '@/lib/audit'
import { requireRoles, checkRoleAccess } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { serializeForResponse } from '../../../lib/bigint-utils'

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  groupId: z.string().optional(),
  divisiId: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().default(true),
})

const updateUserSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  groupId: z.string().optional(),
  divisiId: z.string().optional(),
  isActive: z.boolean().optional(),
})

// GET /api/users - List all users with pagination  
export async function GET(request: NextRequest) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions)
    console.log('🔐 Session check:', { user: session?.user?.email, hasUser: !!session?.user })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For user management, check permissions more flexibly
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: { 
        userRoles: { 
          include: { role: true } 
        },
        group: true
      }
    })

    console.log('👤 Current user:', { 
      email: currentUser?.email, 
      roles: currentUser?.userRoles.map(ur => ur.role.name),
      group: currentUser?.group?.name
    })

    // Allow access for administrators, ppd, or any user with elevated permissions
    const hasAdminAccess = currentUser?.userRoles.some(ur => 
      ['admin', 'org_ppd', 'org_manager', 'org_kadiv'].includes(ur.role.name)
    ) || currentUser?.group?.name === 'admin'

    console.log('🔑 Access check:', { hasAdminAccess, userRoles: currentUser?.userRoles.length })

    if (!hasAdminAccess) {
      console.log('❌ Access denied for user:', currentUser?.email)
      return NextResponse.json({ 
        error: 'Insufficient permissions', 
        details: 'User management requires admin, org_ppd, org_manager, or org_kadiv role'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const groupId = searchParams.get('groupId') || ''
    const divisiId = searchParams.get('divisiId') || ''
    const roleId = searchParams.get('roleId') || ''
    const isActive = searchParams.get('isActive')

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (groupId) where.groupId = groupId
    if (divisiId) where.divisiId = divisiId
    if (roleId) {
      where.userRoles = {
        some: {
          roleId: roleId,
          isActive: true
        }
      }
    }
    if (isActive !== null) where.isActive = isActive === 'true'

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          group: true,
          divisi: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    // Remove sensitive data
    const safeUsers = users.map((user: any) => ({
      ...user,
      passwordHash: undefined,
    }))

    return NextResponse.json(
      serializeForResponse({
        users: safeUsers,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      })
    )
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export const POST = requireRoles(['administrator'])(async function(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validatedData.username },
          { email: validatedData.email },
        ],
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        email: validatedData.email,
        passwordHash: hashedPassword,
        firstName: validatedData.firstName || '',
        lastName: validatedData.lastName || '',
        groupId: validatedData.groupId,
        divisiId: validatedData.divisiId,
        isActive: validatedData.isActive,
      },
      include: {
        group: true,
        divisi: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    // Log user creation
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined
    
    await auditHelpers.userCreated(
      user.id,
      (request as any).user.id,
      {
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      clientIp,
      userAgent
    )

    // Assign role if provided
    if (validatedData.roleId) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: validatedData.roleId,
          assignedBy: (request as any).user.id,
        },
      })
      
      // Log role assignment
      const role = await prisma.role.findUnique({
        where: { id: validatedData.roleId }
      })
      
      if (role) {
        await auditHelpers.roleAssigned(
          user.id,
          validatedData.roleId,
          (request as any).user.id,
          role.name,
          clientIp,
          userAgent
        )
      }
    }

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(safeUser, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})