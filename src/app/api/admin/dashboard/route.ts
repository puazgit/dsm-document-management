import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/permissions'

// GET /api/admin/dashboard - Admin dashboard data
export async function GET(request: NextRequest) {
  // Check if user has admin access
  const permissionCheck = await checkApiPermission(request, 'admin.access')
  
  if (!permissionCheck.success) {
    return NextResponse.json(
      { error: permissionCheck.error },
      { status: permissionCheck.error === 'Unauthorized' ? 401 : 403 }
    )
  }

  try {
    // Return admin dashboard data
    const dashboardData = {
      userCount: 0, // TODO: Get from database
      roleCount: 0, // TODO: Get from database
      documentCount: 0, // TODO: Get from database
      recentActivity: [], // TODO: Get from database
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}