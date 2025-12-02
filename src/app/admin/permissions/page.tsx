'use client'

import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Key, 
  Plus, 
  Search,
  Shield,
  Edit,
  Trash2,
  Users,
  Database,
  FileText,
  MessageSquare,
  Settings,
  Activity,
  AlertTriangle
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  displayName: string
  description: string
  module: string
  action: string
  resource: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    rolePermissions: number
  }
}

interface PermissionFormData {
  name: string
  displayName: string
  description: string
  module: string
  action: string
  resource: string
}

interface ModuleStats {
  module: string
  count: number
  icon: React.ReactNode
  color: string
}

function PermissionsManagementPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)

  // Helper function to determine if a permission is a system permission
  const isSystemPermission = (permission: Permission): boolean => {
    return permission.name.startsWith('admin.') || 
           permission.name.startsWith('system.') ||
           permission.module === 'system' ||
           permission.module === 'admin'
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [formData, setFormData] = useState<PermissionFormData>({
    name: '',
    displayName: '',
    description: '',
    module: '',
    action: '',
    resource: ''
  })
  const { toast } = useToast()

  const moduleIcons: Record<string, React.ReactNode> = {
    users: <Users className="h-4 w-4" />,
    documents: <FileText className="h-4 w-4" />,
    comments: <MessageSquare className="h-4 w-4" />,
    roles: <Shield className="h-4 w-4" />,
    system: <Settings className="h-4 w-4" />,
    audit: <Activity className="h-4 w-4" />,
    database: <Database className="h-4 w-4" />
  }

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    read: 'bg-blue-100 text-blue-800',
    update: 'bg-yellow-100 text-yellow-800',
    delete: 'bg-red-100 text-red-800',
    manage: 'bg-purple-100 text-purple-800',
    approve: 'bg-indigo-100 text-indigo-800',
    export: 'bg-gray-100 text-gray-800'
  }

  const fetchPermissions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/permissions')
      if (!response.ok) throw new Error('Failed to fetch permissions')
      
      const data = await response.json()
      setPermissions(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = 
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesModule = moduleFilter === 'all' || permission.module === moduleFilter
    const matchesAction = actionFilter === 'all' || permission.action === actionFilter
    
    return matchesSearch && matchesModule && matchesAction
  })

  const getModuleStats = (): ModuleStats[] => {
    const stats = permissions.reduce((acc, permission) => {
      const module = permission.module
      if (!acc[module]) {
        acc[module] = 0
      }
      acc[module] = (acc[module] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(stats).map(([module, count]) => ({
      module,
      count,
      icon: moduleIcons[module] || <Key className="h-4 w-4" />,
      color: `hsl(${Object.keys(stats).indexOf(module) * 60}, 70%, 50%)`
    }))
  }

  const getUniqueValues = (field: keyof Permission) => {
    return [...new Set(permissions.map(p => p[field] as string))].sort()
  }

  const handleCreatePermission = async () => {
    try {
      if (!formData.name || !formData.displayName || !formData.module || 
          !formData.action || !formData.resource) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create permission')
      }

      await fetchPermissions()
      setIsCreateDialogOpen(false)
      resetForm()
      
      toast({
        title: 'Success',
        description: 'Permission created successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create permission',
        variant: 'destructive',
      })
    }
  }

  const handleUpdatePermission = async () => {
    if (!selectedPermission) return

    try {
      const response = await fetch(`/api/permissions/${selectedPermission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update permission')
      }

      await fetchPermissions()
      setIsEditDialogOpen(false)
      setSelectedPermission(null)
      resetForm()
      
      toast({
        title: 'Success',
        description: 'Permission updated successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission',
        variant: 'destructive',
      })
    }
  }

  const handleDeletePermission = async (permissionId: string, permissionName: string) => {
    if (!confirm(`Are you sure you want to delete the permission "${permissionName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to delete permission')
      }

      await fetchPermissions()
      toast({
        title: 'Success',
        description: 'Permission deleted successfully',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete permission',
        variant: 'destructive',
      })
    }
  }

  const openEditDialog = (permission: Permission) => {
    setSelectedPermission(permission)
    setFormData({
      name: permission.name,
      displayName: permission.displayName,
      description: permission.description,
      module: permission.module,
      action: permission.action,
      resource: permission.resource || ''
    })
    setIsEditDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      module: '',
      action: '',
      resource: ''
    })
  }

  const generatePermissionName = () => {
    if (formData.module && formData.action && formData.resource) {
      const name = `${formData.module}.${formData.action}.${formData.resource}`
      setFormData(prev => ({ ...prev, name }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Permission Management</h1>
            <p className="text-muted-foreground">
              Manage system permissions and access control
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Permission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Permission</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="module">Module *</Label>
                    <Select 
                      value={formData.module} 
                      onValueChange={(value: string) => {
                        setFormData({ ...formData, module: value })
                        setTimeout(generatePermissionName, 100)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="comments">Comments</SelectItem>
                        <SelectItem value="roles">Roles</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="audit">Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="action">Action *</Label>
                    <Select 
                      value={formData.action} 
                      onValueChange={(value: string) => {
                        setFormData({ ...formData, action: value })
                        setTimeout(generatePermissionName, 100)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="manage">Manage</SelectItem>
                        <SelectItem value="approve">Approve</SelectItem>
                        <SelectItem value="export">Export</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="resource">Resource *</Label>
                    <Input
                      id="resource"
                      value={formData.resource}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFormData({ ...formData, resource: e.target.value })
                        setTimeout(generatePermissionName, 100)
                      }}
                      placeholder="e.g., all"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="name">Permission Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, name: e.target.value })}
                    placeholder="Auto-generated"
                    className="font-mono text-sm"
                  />
                </div>
                
                <div>
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g., Create Users"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                      setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePermission}>
                  Create Permission
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Module Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getModuleStats().map((stat) => (
            <Card key={stat.module} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setModuleFilter(stat.module)}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium capitalize">{stat.module}</p>
                    <p className="text-lg font-bold">{stat.count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>



        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
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
                  {getUniqueValues('module').map((module) => (
                    <SelectItem key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueValues('action').map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="mr-2 h-5 w-5" />
              Permissions ({filteredPermissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredPermissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Key className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-muted-foreground">No permissions found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{permission.displayName}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {permission.name}
                            </div>
                            {permission.description && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {permission.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {moduleIcons[permission.module] || <Key className="h-4 w-4" />}
                            <span className="capitalize">{permission.module}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={actionColors[permission.action] || 'bg-gray-100 text-gray-800'}
                            variant="secondary"
                          >
                            {permission.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {permission.resource}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {permission._count?.rolePermissions || 0} roles
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isSystemPermission(permission) ? 'destructive' : 'default'}>
                            {isSystemPermission(permission) ? 'System' : 'Custom'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(permission)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {!isSystemPermission(permission) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePermission(permission.id, permission.displayName)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Permission Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPermission && isSystemPermission(selectedPermission) && (
                <div className="flex items-start space-x-2 p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div className="text-sm text-orange-700">
                    <p className="font-medium">System Permission</p>
                    <p>Protected system permission - limited editing.</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="editModule">Module *</Label>
                  <Select 
                    value={formData.module} 
                    onValueChange={(value: string) => setFormData({ ...formData, module: value })}
                    disabled={selectedPermission ? isSystemPermission(selectedPermission) : false}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Module" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">Users</SelectItem>
                      <SelectItem value="documents">Documents</SelectItem>
                      <SelectItem value="comments">Comments</SelectItem>
                      <SelectItem value="roles">Roles</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editAction">Action *</Label>
                  <Select 
                    value={formData.action} 
                    onValueChange={(value: string) => setFormData({ ...formData, action: value })}
                    disabled={selectedPermission ? isSystemPermission(selectedPermission) : false}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="manage">Manage</SelectItem>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editResource">Resource *</Label>
                  <Input
                    id="editResource"
                    value={formData.resource}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData({ ...formData, resource: e.target.value })}
                    disabled={selectedPermission ? isSystemPermission(selectedPermission) : false}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="editName">Permission Name</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({ ...formData, name: e.target.value })}
                  disabled={selectedPermission ? isSystemPermission(selectedPermission) : false}
                  className="font-mono text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="editDisplayName">Display Name *</Label>
                <Input
                  id="editDisplayName"
                  value={formData.displayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                    setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePermission}>
                Update Permission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(PermissionsManagementPage, { 
  requiredRoles: ['administrator', 'admin', 'org_administrator', 'ppd'] 
})