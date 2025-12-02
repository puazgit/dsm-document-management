'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
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
    permissions: []
  })
  const { toast } = useToast()

  const fetchRoles = async () => {
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
  }

  const fetchPermissions = async () => {
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
  }

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

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
      setFormData({ name: '', displayName: '', description: '', permissions: [] })
      
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
      setFormData({ name: '', displayName: '', description: '', permissions: [] })
      
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
    
    // Filter only permissions that are actually used in the documents table functionality
    const documentRelevantPermissions = [
      'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.download',
      'documents.update.own', 'documents.delete.own', 'documents.read.own',
      'pdf.view', 'pdf.download', 'pdf.print', 'pdf.copy', 'pdf.watermark',
      'admin.access', 'admin.systemConfig',
      'users.create', 'users.read', 'users.update', 'users.delete', 'users.update.own',
      'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.assign',
      'system.admin', 'system.analytics', 'system.logs', 'system.settings',
      'document-types.create', 'document-types.read', 'document-types.update', 'document-types.delete'
    ]
    
    const relevantPermissions = permissions.filter(permission => 
      documentRelevantPermissions.includes(`${permission.module}.${permission.action}`)
    )
    
    const grouped = relevantPermissions.reduce((acc, permission) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Role Management</h1>
            <p className="text-muted-foreground">
              Manage roles and their permissions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
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
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-4 border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="text-sm text-gray-600 mb-3 p-2 bg-blue-50 rounded">
                    <strong>Info:</strong> Permissions shown below are actually used in the Documents table at /documents
                  </div>
                    {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                      <div key={module}>
                        <h4 className="font-medium mb-2 capitalize text-blue-700">
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
                            <label key={permission.id} className="flex items-center space-x-2 text-sm p-2 hover:bg-gray-50 rounded">
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
                              <span className="text-gray-500 text-xs">- {permission.description}</span>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              <Shield className="mr-2 h-5 w-5" />
              Roles ({filteredRoles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
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
                        <TableCell colSpan={6}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredRoles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
                              <div className="text-xs text-muted-foreground mt-1">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="mr-1 h-4 w-4" />
                            {role._count?.userRoles || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Key className="mr-1 h-4 w-4" />
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
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(role)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteRole(role.id, role.displayName)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
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
                <Label>Permissions</Label>
                <div className="mt-2 space-y-4 border rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="text-sm text-gray-600 mb-3 p-2 bg-blue-50 rounded">
                    <strong>Info:</strong> Permissions shown below are actually used in the Documents table at /documents
                  </div>
                  {Object.entries(getPermissionsByModule()).map(([module, modulePermissions]) => (
                    <div key={module}>
                      <h4 className="font-medium mb-2 capitalize text-blue-700">
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
                          <label key={permission.id} className="flex items-center space-x-2 text-sm p-2 hover:bg-gray-50 rounded">
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
                            <span className="text-gray-500 text-xs">- {permission.description}</span>
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