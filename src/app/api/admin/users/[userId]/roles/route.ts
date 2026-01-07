import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/next-auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/admin/users/[userId]/roles
 * Assign a role to a user
 */
export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check authorization (admin only)
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { userId } = params
    const body = await request.json()
    const { roleId, isManuallyAssigned = true } = body

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      )
    }

    // Check if user already has this role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    })

    if (existingUserRole) {
      // Update existing role assignment
      const updatedUserRole = await prisma.userRole.update({
        where: { id: existingUserRole.id },
        data: {
          isManuallyAssigned,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          isActive: true,
        },
      })

      return NextResponse.json({
        message: "Role assignment updated",
        userRole: updatedUserRole,
      })
    }

    // Create new role assignment
    const userRole = await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: session.user.id,
        isManuallyAssigned,
        isActive: true,
      },
    })

    return NextResponse.json({
      message: "Role assigned successfully",
      userRole,
    })
  } catch (error) {
    console.error("Error assigning role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/users/[userId]/roles
 * Remove a role from a user
 */
export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check authorization (admin only)
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    const { userId } = params
    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get('roleId')

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      )
    }

    // Deactivate user role
    await prisma.userRole.updateMany({
      where: {
        userId,
        roleId,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({
      message: "Role removed successfully",
    })
  } catch (error) {
    console.error("Error removing role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
