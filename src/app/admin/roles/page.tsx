'use client'

import { useState, useEffect } from 'react'
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

interface Capability {
  id: string
  name: string
  description: string | null
  category: string | null
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
  capabilityAssignments?: {
    capability: Capability
  }[]
}

interface RoleFormData {
  name: string
  displayName: string
  description: string
  capabilities: string[]
}

export default function RolesManagementPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    displayName: '',
    description: '',
    capabilities: []
  })
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const { toast } = useToast()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openDropdownId])

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

  const fetchCapabilities = async () => {
    try {
      const response = await fetch('/api/admin/capabilities')
      if (!response.ok) throw new Error('Failed to fetch capabilities')
      
      const data = await response.json()
      setCapabilities(data.capabilities || [])
    } catch (error) {
      console.error('Failed to fetch capabilities:', error)
      setCapabilities([])
      toast({
        title: 'Error',
        description: 'Failed to fetch capabilities',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchCapabilities()
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
      setFormData({ name: '', displayName: '', description: '', capabilities: [] })
      
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
      setFormData({ name: '', displayName: '', description: '', capabilities: [] })
      
      toast({
        title: 'Success',
        description: 'Role updated successfully',
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
      capabilities: role.capabilityAssignments?.map(ca => ca.capability.id) || []
    })
    setIsEditDialogOpen(true)
  }

  const handleCapabilityToggle = (capabilityId: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(capabilityId)
        ? prev.capabilities.filter(id => id !== capabilityId)
        : [...prev.capabilities, capabilityId]
    }))
  }

  const getCapabilitiesByCategory = () => {
    if (!capabilities || capabilities.length === 0) {
      return {} as Record<string, Capability[]>
    }
    
    const grouped = capabilities.reduce((acc, capability) => {
      const category = capability.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category]!.push(capability)
      return acc
    }, {} as Record<string, Capability[]>)
    return grouped
  }

  return (
    <div className="space-y-6">
      {/* Create Role Button */}
      <div className="flex justify-end">
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
                  <Label>Capabilities</Label>
                  <div className="mt-2 space-y-4 border rounded-lg p-4 max-h-60 overflow-y-auto">
                    {Object.entries(getCapabilitiesByCategory()).map(([category, categoryCapabilities]) => (
                      <div key={category}>
                        <h4 className="font-medium mb-2 capitalize">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {(categoryCapabilities || []).map((capability) => (
                            <label key={capability.id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={formData.capabilities.includes(capability.id)}
                                onChange={() => handleCapabilityToggle(capability.id)}
                                className="rounded"
                              />
                              <span>{capability.name}</span>
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
                  <TableHead>Capabilities</TableHead>
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
                          {role.capabilityAssignments?.length || 0}
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
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdownId(openDropdownId === role.id ? null : role.id)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {openDropdownId === role.id && (
                            <div 
                              className="absolute right-0 mt-1 w-[160px] bg-white rounded-md shadow-lg border z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    openEditDialog(role)
                                    setOpenDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </button>
                                {!role.isSystem && (
                                  <button
                                    onClick={() => {
                                      handleDeleteRole(role.id, role.displayName)
                                      setOpenDropdownId(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
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
              <Label>Capabilities</Label>
              <div className="mt-2 space-y-4 border rounded-lg p-4 max-h-60 overflow-y-auto">
                {Object.entries(getCapabilitiesByCategory()).map(([category, categoryCapabilities]) => (
                  <div key={category}>
                    <h4 className="font-medium mb-2 capitalize">{category}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(categoryCapabilities || []).map((capability) => (
                        <label key={capability.id} className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.capabilities.includes(capability.id)}
                            onChange={() => handleCapabilityToggle(capability.id)}
                            className="rounded"
                          />
                          <span>{capability.name}</span>
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
  )
}