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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Users, Check, X, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingCapability, setEditingCapability] = useState<Capability | null>(null)
  const [deletingCapability, setDeletingCapability] = useState<Capability | null>(null)
  const [newCapability, setNewCapability] = useState({
    name: '',
    description: '',
    category: 'system',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'system',
  })
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [pendingToggle, setPendingToggle] = useState<{
    roleId: string
    capabilityId: string
    currentlyHas: boolean
    roleName: string
    capabilityName: string
  } | null>(null)

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

  const handleConfirmToggle = (roleId: string, capabilityId: string, currentlyHas: boolean, roleName: string, capabilityName: string) => {
    setPendingToggle({ roleId, capabilityId, currentlyHas, roleName, capabilityName })
    setConfirmDialogOpen(true)
  }

  const executeToggle = async () => {
    if (!pendingToggle) return
    
    const { roleId, capabilityId, currentlyHas } = pendingToggle
    const savingKey = `${roleId}-${capabilityId}`
    setSaving(savingKey)
    setConfirmDialogOpen(false)
    
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
        
        // Clear workflow cache to reflect changes immediately
        await fetch('/api/admin/clear-workflow-cache', { method: 'POST' })
        
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
      setPendingToggle(null)
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

  const handleCreateCapability = async () => {
    if (!newCapability.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Capability name is required',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/admin/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCapability),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Capability created successfully',
        })
        setDialogOpen(false)
        setNewCapability({ name: '', description: '', category: 'system' })
        fetchData() // Refresh data
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to create capability',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create capability',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const openEditDialog = (capability: Capability) => {
    setEditingCapability(capability)
    setEditForm({
      name: capability.name,
      description: capability.description || '',
      category: capability.category || 'system',
    })
    setEditDialogOpen(true)
  }

  const handleEditCapability = async () => {
    if (!editingCapability) return

    setCreating(true)
    try {
      const response = await fetch(`/api/admin/capabilities?id=${editingCapability.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Capability updated successfully',
        })
        setEditDialogOpen(false)
        setEditingCapability(null)
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
      setCreating(false)
    }
  }

  const openDeleteDialog = (capability: Capability) => {
    setDeletingCapability(capability)
    setDeleteDialogOpen(true)
  }

  const handleDeleteCapability = async () => {
    if (!deletingCapability) return

    try {
      const response = await fetch(`/api/admin/capabilities?id=${deletingCapability.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Capability deleted successfully',
        })
        setDeleteDialogOpen(false)
        setDeletingCapability(null)
        fetchData()
      } else {
        const data = await response.json()
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete capability',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete capability',
        variant: 'destructive',
      })
    }
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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Capability
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Capability</DialogTitle>
              <DialogDescription>
                Add a new capability to the system. It will be available for assignment to roles.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., DOCUMENT_CREATE"
                  value={newCapability.name}
                  onChange={(e) =>
                    setNewCapability({ ...newCapability, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                  }
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground">
                  Use UPPER_CASE format with underscores
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this capability allows"
                  value={newCapability.description}
                  onChange={(e) =>
                    setNewCapability({ ...newCapability, description: e.target.value })
                  }
                  disabled={creating}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={newCapability.category}
                  onValueChange={(value) =>
                    setNewCapability({ ...newCapability, category: value })
                  }
                  disabled={creating}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="analytics">Analytics</SelectItem>
                    <SelectItem value="audit">Audit</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false)
                  setNewCapability({ name: '', description: '', category: 'system' })
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateCapability} disabled={creating}>
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Capability'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                          <TableHead className="w-[100px] text-center">Actions</TableHead>
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
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openEditDialog(capability)}
                                  title="Edit capability"
                                >
                                  <Pencil className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => openDeleteDialog(capability)}
                                  title="Delete capability"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
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
                                          handleConfirmToggle(role.id, capability.id, has, role.name, capability.name)
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

      {/* Edit Capability Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Capability</DialogTitle>
            <DialogDescription>
              Update capability information. Name changes will affect all resources using this capability.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })
                }
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                Use UPPER_CASE format with underscores
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe what this capability allows"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                disabled={creating}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, category: value })
                }
                disabled={creating}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditingCapability(null)
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCapability} disabled={creating}>
              {creating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Update Capability'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Toggle Capability */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {pendingToggle && (
                <>
                  <p>
                    Apakah Anda yakin akan {pendingToggle.currentlyHas ? 'menghapus' : 'menambahkan'} capability ini?
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Role:</span>
                        <span className="font-semibold">{pendingToggle.roleName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capability:</span>
                        <span className="font-mono font-semibold">{pendingToggle.capabilityName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Action:</span>
                        <span className={`font-semibold ${pendingToggle.currentlyHas ? 'text-red-600' : 'text-green-600'}`}>
                          {pendingToggle.currentlyHas ? 'Remove' : 'Add'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {pendingToggle.currentlyHas && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                      <div className="flex gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-semibold">Perhatian:</p>
                          <p className="mt-1">User dengan role ini akan kehilangan akses terkait capability ini. Pastikan untuk logout dan login kembali untuk melihat perubahan.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingToggle(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeToggle}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Capability Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Capability</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong className="font-mono">{deletingCapability?.name}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Warning:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>All role assignments will be removed</li>
                      <li>Resources using this capability will lose access control</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCapability}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Capability
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
// Protect page with ROLE_MANAGE capability
export default withAuth(RoleCapabilitiesPage, {
  requiredCapabilities: ['ROLE_MANAGE']
});