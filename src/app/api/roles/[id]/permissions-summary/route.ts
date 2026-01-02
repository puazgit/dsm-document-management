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
        capabilityAssignments: {
          include: {
            capability: true
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

    // Extract capability names
    const capabilityNames = role.capabilityAssignments.map(ca => ca.capability.name)

    // Check for specific capabilities - map to PDF permissions
    const summary = {
      canDownload: capabilityNames.includes('DOCUMENT_DOWNLOAD') || capabilityNames.includes('DOCUMENT_FULL_ACCESS') || capabilityNames.includes('ADMIN_ACCESS'),
      canPrint: capabilityNames.includes('DOCUMENT_PRINT') || capabilityNames.includes('DOCUMENT_FULL_ACCESS') || capabilityNames.includes('ADMIN_ACCESS'),
      canCopy: capabilityNames.includes('DOCUMENT_COPY') || capabilityNames.includes('DOCUMENT_FULL_ACCESS') || capabilityNames.includes('ADMIN_ACCESS'),
      showWatermark: !capabilityNames.includes('DOCUMENT_NO_WATERMARK') && !capabilityNames.includes('ADMIN_ACCESS')
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
