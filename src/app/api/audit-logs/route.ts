import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkApiPermission } from '@/lib/permissions'
import { getAuditLogs, AuditAction, AuditResource } from '@/lib/audit'
import { z } from 'zod'

const auditLogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.nativeEnum(AuditAction).optional(),
  resource: z.nativeEnum(AuditResource).optional(),
  actorId: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

// GET /api/audit-logs - Get audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permissions
    const permissionCheck = await checkApiPermission(request, 'audit.read')
    
    if (!permissionCheck.success) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: permissionCheck.error === 'Unauthorized' ? 401 : 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validatedParams = auditLogQuerySchema.parse(queryParams)

    const result = await getAuditLogs(validatedParams)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}