import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/next-auth'
import { prisma } from '@/lib/prisma'
import { auditHelpers } from '@/lib/audit'
import { requireCapability } from '@/lib/rbac-helpers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'USER_VIEW')

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        group: true,
        divisi: true,
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'USER_MANAGE')

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = updateUserSchema.parse(body)

    // Check if username/email conflicts exist
    if (validatedData.username || validatedData.email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: params.id } },
            {
              OR: [
                ...(validatedData.username ? [{ username: validatedData.username }] : []),
                ...(validatedData.email ? [{ email: validatedData.email }] : []),
              ],
            },
          ],
        },
      })

      if (conflictUser) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Hash password if provided
    if (validatedData.password) {
      updateData.passwordHash = await bcrypt.hash(validatedData.password, 10)
      delete updateData.password // Remove plain password from data
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    // Log user update
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || undefined
    
    await auditHelpers.userUpdated(
      params.id,
      auth.userId!,
      validatedData,
      clientIp,
      userAgent
    )

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = updatedUser

    return NextResponse.json(safeUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Permanently delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireCapability(request, 'USER_DELETE')
    const { id } = params

    // Check if user exists and get user info for audit
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
      }
    })

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-deletion
    if (id === auth.userId) {
      return NextResponse.json({ 
        error: 'Cannot delete your own account' 
      }, { status: 400 })
    }

    // Get client IP and user agent for audit
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Use transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Delete user roles first (foreign key constraint)
      await tx.userRole.deleteMany({
        where: { userId: id }
      })

      // Delete document activities by this user
      await tx.documentActivity.deleteMany({
        where: { userId: id }
      })

      // Finally delete the user
      await tx.user.delete({
        where: { id }
      })
    })

    // Log the deletion for audit
    await auditHelpers.userDeleted(
      auth.userId!,
      userToDelete.id,
      `User deleted: ${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email})`,
      clientIp,
      userAgent
    )

    return NextResponse.json({ 
      message: 'User permanently deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        email: userToDelete.email,
        name: `${userToDelete.firstName} ${userToDelete.lastName}`
      }
    })
  } catch (error) {
    console.error('Error permanently deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user permanently' },
      { status: 500 }
    )
  }
}