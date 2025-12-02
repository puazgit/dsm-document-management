'use client'

import { useState } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PermissionMatrix } from '@/components/admin/permission-matrix'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Key, Shield, Database, Users } from 'lucide-react'

function PermissionOverviewPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground">
            Manage permissions and role assignments
          </p>
        </div>

        <Tabs defaultValue="matrix" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matrix" className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              Permission Matrix
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              System Overview
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matrix" className="space-y-6">
            <PermissionMatrix />
          </TabsContent>
          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Key className="mr-2 h-5 w-5" />
                    Permission Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Permission analytics and usage statistics will be displayed here.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    Role Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Role distribution and assignment analytics will be displayed here.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(PermissionOverviewPage, { 
  requiredRoles: ['administrator', 'admin', 'org_administrator', 'ppd'] 
})