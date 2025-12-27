'use client'

import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Users, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Capability {
  id: string
  name: string
  description: string | null
  category: string | null
}

interface Role {
  id: string
  name: string
  description: string | null
  level: number
  capabilityAssignments: {
    capabilityId: string
    capability: Capability
  }[]
}

function RoleCapabilitiesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch roles with capabilities
      const rolesResponse = await fetch('/api/admin/role-capabilities')
      const rolesData = await rolesResponse.json()
      
      // Fetch all capabilities
      const capsResponse = await fetch('/api/admin/capabilities')
      const capsData = await capsResponse.json()
      
      if (rolesResponse.ok && capsResponse.ok) {
        setRoles(rolesData.roles)
        setCapabilities(capsData.capabilities)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch data',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const hasCapability = (role: Role, capabilityId: string): boolean => {
    return role.capabilityAssignments.some(
      (assignment) => assignment.capabilityId === capabilityId
    )
  }

  const toggleCapability = async (roleId: string, capabilityId: string, currentlyHas: boolean) => {
    const savingKey = `${roleId}-${capabilityId}`
    setSaving(savingKey)
    
    try {
      const response = await fetch('/api/admin/role-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleId,
          capabilityId,
          action: currentlyHas ? 'unassign' : 'assign',
        }),
      })
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: currentlyHas
            ? 'Capability removed from role'
            : 'Capability assigned to role',
        })
        fetchData()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to update capability',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update capability',
        variant: 'destructive',
      })
    } finally {
      setSaving(null)
    }
  }

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      system: 'bg-purple-100 text-purple-800',
      user: 'bg-blue-100 text-blue-800',
      document: 'bg-green-100 text-green-800',
      organization: 'bg-yellow-100 text-yellow-800',
      analytics: 'bg-orange-100 text-orange-800',
      audit: 'bg-red-100 text-red-800',
      workflow: 'bg-indigo-100 text-indigo-800',
    }
    return colors[category || 'system'] || 'bg-gray-100 text-gray-800'
  }

  const groupedCapabilities = capabilities.reduce((acc, cap) => {
    const category = cap.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(cap)
    return acc
  }, {} as Record<string, Capability[]>)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role-Capability Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage which capabilities are assigned to each role
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 flex-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Total Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{capabilities.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capability Matrix</CardTitle>
          <CardDescription>
            Check/uncheck to assign or remove capabilities from roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedCapabilities).map(([category, caps]) => (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className={getCategoryColor(category)}>
                      {category.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({caps.length} capabilities)
                    </span>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Capability</TableHead>
                          {roles.map((role) => (
                            <TableHead key={role.id} className="text-center">
                              <div className="flex flex-col items-center">
                                <span className="font-semibold">{role.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  Level {role.level}
                                </span>
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {caps.map((capability) => (
                          <TableRow key={capability.id}>
                            <TableCell>
                              <div>
                                <div className="font-mono text-sm font-medium">
                                  {capability.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {capability.description}
                                </div>
                              </div>
                            </TableCell>
                            {roles.map((role) => {
                              const has = hasCapability(role, capability.id)
                              const savingKey = `${role.id}-${capability.id}`
                              const isSaving = saving === savingKey

                              return (
                                <TableCell key={role.id} className="text-center">
                                  <div className="flex justify-center">
                                    {isSaving ? (
                                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() =>
                                          toggleCapability(role.id, capability.id, has)
                                        }
                                      >
                                        {has ? (
                                          <Check className="w-5 h-5 text-green-600" />
                                        ) : (
                                          <X className="w-5 h-5 text-gray-300" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{role.name}</span>
                <Badge variant="outline">Level {role.level}</Badge>
              </CardTitle>
              <CardDescription>{role.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Capabilities ({role.capabilityAssignments.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {role.capabilityAssignments.slice(0, 5).map((assignment) => (
                    <Badge
                      key={assignment.capabilityId}
                      variant="secondary"
                      className="text-xs"
                    >
                      {assignment.capability.name}
                    </Badge>
                  ))}
                  {role.capabilityAssignments.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{role.capabilityAssignments.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
// Protect page with ROLE_MANAGE capability
export default withAuth(RoleCapabilitiesPage, {
  requiredCapabilities: ['ROLE_MANAGE']
});