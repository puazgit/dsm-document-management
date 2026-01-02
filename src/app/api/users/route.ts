import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { auditHelpers } from '@/lib/audit'
import { requireCapability } from '@/lib/rbac-helpers'
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
    // Check capability using database-driven RBAC
    const auth = await requireCapability(request, 'USER_VIEW')
    if (!auth.authorized) return auth.error

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
export async function POST(request: NextRequest) {
  try {
    // Check capability using database-driven RBAC
    const auth = await requireCapability(request, 'USER_MANAGE')
    if (!auth.authorized) return auth.error

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
      auth.userId!,
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
          assignedBy: auth.userId!,
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
          auth.userId!,
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
}