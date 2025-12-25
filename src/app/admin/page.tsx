'use client'

import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Users, Shield, Settings, Activity, FileText } from 'lucide-react'
import Link from 'next/link'

function AdminDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users, roles, and system settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Link href="/admin/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Management</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage users, roles, and permissions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/groups">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Group Management</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage user groups and permissions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/roles">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Role Management</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Configure roles and permissions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/permissions">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissions</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage granular permissions
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/capabilities">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage role capabilities (NEW)
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/workflows">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workflows</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage workflow transitions (NEW)
              </p>
            </CardContent>
          </Card>
        </Link>


        <Link href="/admin/settings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Settings</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                System configuration and preferences
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/audit-logs">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                View system activity and logs
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
      </div>
    </DashboardLayout>
  )
}

// Export with admin protection
export default withAuth(AdminDashboard, {
  requiredRoles: ['administrator', 'admin', 'org_administrator'],
  redirectTo: '/unauthorized'
})