import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/roles/[id]/permissions-summary - Get simplified permissions for a role
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = params.id

    // Try to find role by ID or by name
    const role = await prisma.role.findFirst({
      where: {
        OR: [
          { id: roleId },
          { name: roleId }
        ]
      },
      include: {
        rolePermissions: {
          where: {
            isGranted: true
          },
          include: {
            permission: true
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Extract permission names
    const permissionNames = role.rolePermissions.map(rp => rp.permission.name)

    // Check for specific PDF permissions
    const summary = {
      canDownload: permissionNames.includes('pdf.download') || permissionNames.includes('documents.download'),
      canPrint: permissionNames.includes('pdf.print'),
      canCopy: permissionNames.includes('pdf.copy'),
      showWatermark: !permissionNames.includes('pdf.watermark')
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching role permissions summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
