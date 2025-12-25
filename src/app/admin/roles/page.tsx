'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  Plus, 
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  Key,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  description: string
  module: string
  action: string
  resource: string
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string
  level: number
  isSystem: boolean
  createdAt: string
  _count: {
    userRoles: number
  }
  rolePermissions: {
    permission: Permission
  }[]
}

interface RoleFormData {
  name: string
  displayName: string
  description: string
  level: number
  permissions: string[]
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    displayName: '',
    description: '',
    level: 10,
    permissions: []
  })
  const { toast } = useToast()

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/roles?includePermissions=true')
      if (!response.ok) throw new Error('Failed to fetch roles')
      
      const data = await response.json()
      setRoles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      setRoles([])
      toast({
        title: 'Error',
        description: 'Failed to fetch roles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/permissions')
      if (!response.ok) throw new Error('Failed to fetch permissions')
      
      const data = await response.json()
      setPermissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
      setPermissions([])
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions',
        variant: 'destructive',
      })
    }
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [fetchRoles, fetchPermissions])

  const filteredRoles = roles.filter(role =>
    role.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateRole = async () => {
    try {
      console.log('🔄 Creating role with data:', formData)
      
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Create failed:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to create role`)
      }

      const createdRole = await response.json()
      console.log('✅ Role created successfully:', createdRole)

      await fetchRoles()
      setIsCreateDialogOpen(false)
      setFormData({ name: '', displayName: '', description: '', level: 10, permissions: [] })
      
      toast({
        title: 'Success',
        description: 'Role created successfully',
      })
    } catch (error: any) {
      console.error('💥 Create role error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create role',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateRole = async () => {
    if (!selectedRole) return

    try {
      console.log('🔄 Updating role with data:', formData)
      
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Update failed:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update role`)
      }

      const updatedRole = await response.json()
      console.log('✅ Role updated successfully:', updatedRole)

      await fetchRoles()
      setIsEditDialogOpen(false)
      setSelectedRole(null)
      setFormData({ name: '', displayName: '', description: '', level: 10, permissions: [] })
      
      // Trigger session refresh for affected users
      await fetch('/api/auth/refresh-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRole.id })
      })
      
      toast({
        title: 'Success',
        description: 'Role updated successfully. Users will need to refresh their browser to see permission changes.',
      })
    } catch (error: any) {
      console.error('💥 Update role error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) return

    try {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete role')

      await fetchRoles()
      toast({
        title: 'Success',
        description: 'Role deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (role: Role) => {
    setSelectedRole(role)
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level || 10,
      permissions: role.rolePermissions?.map(rp => rp.permission.id) || []
    })
    setIsEditDialogOpen(true)
  }

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const getPermissionsByModule = () => {
    if (!permissions || permissions.length === 0) {
      return {} as Record<string, Permission[]>
    }
    
    // Group all permissions by module (no filtering)
    const grouped = permissions.reduce((acc, permission) => {
      const module = permission.module
      if (!acc[module]) {
        acc[module] = []
      }
      acc[module]!.push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
    
    return grouped
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Manage roles and their permissions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Define a new role with permissions and access level
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., content_manager"
                  />
                </div>
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., Content Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Role description..."
                  />
                </div>
                <div>
                  <Label htmlFor="level">Level (0-100)</Label>
                  <Input
                    id="level"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.level}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, level: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher level = more authority. Admin=100, Manager=70, Editor=50, Viewer=10
                  </p>
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="p-4 mt-2 space-y-4 overflow-y-auto border rounded-lg max-h-60">
                  <div className="p-2 mb-3 text-sm text-gray-600 rounded bg-blue-50">
                    <strong>Info:</strong> Permissions shown below are actually used in the Documents table at /documents
                  </div>
                    {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                      <div key={module}>
                        <h4 className="mb-2 font-medium text-blue-700 capitalize">
                          {module === 'documents' ? '📄 Documents Management' : 
                           module === 'pdf' ? '📋 PDF Controls' :
                           module === 'users' ? '👥 User Management' :
                           module === 'roles' ? '🔐 Role Management' :
                           module === 'admin' ? '⚙️ Admin Functions' :
                           module === 'system' ? '🖥️ System Settings' :
                           module === 'document-types' ? '📁 Document Types' : 
                           module}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                          {(modulePermissions || []).map((permission) => (
                            <label key={permission.id} className="flex items-center p-2 space-x-2 text-sm rounded hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission.id)}
                                onChange={() => handlePermissionToggle(permission.id)}
                                className="rounded"
                              />
                              <span className="font-medium text-gray-700">
                                {permission.module}.{permission.action}
                                {permission.resource && permission.resource !== 'all' && permission.resource !== 'null' && 
                                  ` (${permission.resource})`}
                              </span>
                              <span className="text-xs text-gray-500">- {permission.description}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Roles ({filteredRoles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center">
                        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-muted-foreground">No roles found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{role.displayName}</div>
                            <div className="text-sm text-muted-foreground">
                              {role.name}
                            </div>
                            {role.description && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {role.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {role._count?.userRoles || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Key className="w-4 h-4 mr-1" />
                            {role.rolePermissions?.length || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.isSystem ? 'destructive' : 'default'}>
                            {role.isSystem ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(role.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="w-8 h-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(role)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRole(role.id, role.displayName)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Modify role details and update assigned permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Role Name</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  disabled={selectedRole?.isSystem}
                />
              </div>
              <div>
                <Label htmlFor="editDisplayName">Display Name</Label>
                <Input
                  id="editDisplayName"
                  value={formData.displayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="editLevel">Level (0-100)</Label>
                <Input
                  id="editLevel"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.level}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, level: parseInt(e.target.value) || 10 })}
                  disabled={selectedRole?.isSystem}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher level = more authority. Admin=100, Manager=70, Editor=50, Viewer=10
                </p>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="p-4 mt-2 space-y-4 overflow-y-auto border rounded-lg max-h-60">
                  <div className="p-2 mb-3 text-sm text-gray-600 rounded bg-blue-50">
                    <strong>Info:</strong> Permissions shown below are actually used in the Documents table at /documents
                  </div>
                  {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                    <div key={module}>
                      <h4 className="mb-2 font-medium text-blue-700 capitalize">
                        {module === 'documents' ? '📄 Documents Management' : 
                         module === 'pdf' ? '📋 PDF Controls' :
                         module === 'users' ? '👥 User Management' :
                         module === 'roles' ? '🔐 Role Management' :
                         module === 'admin' ? '⚙️ Admin Functions' :
                         module === 'system' ? '🖥️ System Settings' :
                         module === 'document-types' ? '📁 Document Types' : 
                         module}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {(modulePermissions || []).map((permission) => (
                          <label key={permission.id} className="flex items-center p-2 space-x-2 text-sm rounded hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission.id)}
                              onChange={() => handlePermissionToggle(permission.id)}
                              className="rounded"
                            />
                            <span className="font-medium text-gray-700">
                              {permission.module}.{permission.action}
                              {permission.resource && permission.resource !== 'all' && permission.resource !== 'null' && 
                                ` (${permission.resource})`}
                            </span>
                            <span className="text-xs text-gray-500">- {permission.description}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole}>
                Update Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}