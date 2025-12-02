'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  Key, 
  Check, 
  X,
  Search,
  Filter,
  Users,
  FileText,
  MessageSquare,
  Settings,
  Activity,
  Database,
  Eye,
  Save
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  displayName: string
  module: string
  action: string
  resource: string
}

interface Role {
  id: string
  name: string
  displayName: string
  isSystem: boolean
  rolePermissions: {
    permissionId: string
    isGranted: boolean
  }[]
}

interface PermissionMatrixProps {
  className?: string
}

export function PermissionMatrix({ className }: PermissionMatrixProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [changes, setChanges] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const moduleIcons: Record<string, React.ReactNode> = {
    users: <Users className="h-3 w-3" />,
    documents: <FileText className="h-3 w-3" />,
    comments: <MessageSquare className="h-3 w-3" />,
    roles: <Shield className="h-3 w-3" />,
    system: <Settings className="h-3 w-3" />,
    audit: <Activity className="h-3 w-3" />,
    database: <Database className="h-3 w-3" />
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [permissionsRes, rolesRes] = await Promise.all([
        fetch('/api/permissions'),
        fetch('/api/roles')
      ])

      if (!permissionsRes.ok || !rolesRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [permissionsData, rolesData] = await Promise.all([
        permissionsRes.json(),
        rolesRes.json()
      ])

      setPermissions(permissionsData)
      setRoles(rolesData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions matrix data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModule = moduleFilter === 'all' || permission.module === moduleFilter
    
    return matchesSearch && matchesModule
  })

  const filteredRoles = roles.filter(role => {
    return roleFilter === 'all' || role.id === roleFilter
  })

  const hasPermission = (roleId: string, permissionId: string): boolean => {
    const changeKey = `${roleId}-${permissionId}`
    if (changes[changeKey] !== undefined) {
      return changes[changeKey]
    }

    const role = roles.find(r => r.id === roleId)
    if (!role) return false

    const rolePermission = role.rolePermissions.find(rp => rp.permissionId === permissionId)
    return rolePermission?.isGranted || false
  }

  const togglePermission = (roleId: string, permissionId: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.isSystem) {
      toast({
        title: 'Warning',
        description: 'Cannot modify system role permissions',
        variant: 'destructive',
      })
      return
    }

    const changeKey = `${roleId}-${permissionId}`
    const currentValue = hasPermission(roleId, permissionId)
    
    setChanges(prev => ({
      ...prev,
      [changeKey]: !currentValue
    }))
  }

  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: 'No Changes',
        description: 'No permission changes to save',
      })
      return
    }

    try {
      setSaving(true)

      for (const [changeKey, isGranted] of Object.entries(changes)) {
        const [roleId, permissionId] = changeKey.split('-')
        
        const response = await fetch(`/api/roles/${roleId}/permissions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissionId, isGranted }),
        })

        if (!response.ok) {
          throw new Error(`Failed to update permission ${permissionId} for role ${roleId}`)
        }
      }

      await fetchData()
      setChanges({})
      
      toast({
        title: 'Success',
        description: `${Object.keys(changes).length} permission changes saved successfully`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save changes',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const discardChanges = () => {
    setChanges({})
    toast({
      title: 'Changes Discarded',
      description: 'All unsaved changes have been discarded',
    })
  }

  const getUniqueModules = () => {
    return [...new Set(permissions.map(p => p.module))].sort()
  }

  const hasChanges = Object.keys(changes).length > 0

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Permission Matrix
            </CardTitle>
            {hasChanges && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {Object.keys(changes).length} changes
                </Badge>
                <Button variant="outline" size="sm" onClick={discardChanges}>
                  <X className="mr-1 h-3 w-3" />
                  Discard
                </Button>
                <Button size="sm" onClick={saveChanges} disabled={saving}>
                  <Save className="mr-1 h-3 w-3" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {getUniqueModules().map((module) => (
                  <SelectItem key={module} value={module}>
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium min-w-[300px]">
                      Permission
                    </th>
                    {filteredRoles.map((role) => (
                      <th key={role.id} className="text-center p-3 font-medium min-w-[120px]">
                        <div className="flex flex-col items-center space-y-1">
                          <Badge variant={role.isSystem ? 'destructive' : 'default'}>
                            {role.displayName}
                          </Badge>
                          {role.isSystem && (
                            <span className="text-xs text-muted-foreground">System</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissions.map((permission) => (
                    <tr key={permission.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded">
                            {moduleIcons[permission.module] || <Key className="h-3 w-3" />}
                          </div>
                          <div>
                            <div className="font-medium">{permission.displayName}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {permission.name}
                            </div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {permission.module}.{permission.action}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      {filteredRoles.map((role) => (
                        <td key={`${role.id}-${permission.id}`} className="p-3 text-center">
                          <button
                            onClick={() => togglePermission(role.id, permission.id)}
                            disabled={role.isSystem}
                            className={`
                              w-8 h-8 rounded-full border-2 transition-colors duration-200
                              ${hasPermission(role.id, permission.id)
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-gray-100 border-gray-300 hover:border-gray-400'
                              }
                              ${role.isSystem 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'cursor-pointer hover:scale-110'
                              }
                              ${changes[`${role.id}-${permission.id}`] !== undefined 
                                ? 'ring-2 ring-blue-500' 
                                : ''
                              }
                            `}
                          >
                            {hasPermission(role.id, permission.id) ? (
                              <Check className="h-4 w-4" />
                            ) : null}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredPermissions.length === 0 && (
                <div className="text-center py-8">
                  <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No permissions found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}