'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Users, Building } from 'lucide-react'

// Simplified Group interface - organizational structure only
interface Group {
  id: string
  name: string
  displayName: string
  description: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    users: number
  }
}

interface GroupFormData {
  name: string
  displayName: string
  description: string
}

function GroupsManagementPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    displayName: '',
    description: ''
  })

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups?includeUsers=true')
      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }
      const data = await response.json()
      const groupsList = data.groups || data || []
      setGroups(Array.isArray(groupsList) ? groupsList : [])
    } catch (error) {
      console.error('Error fetching groups:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load groups',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const handleCreateGroup = async () => {
    try {
      const createData = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description
      }

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create group')
      }

      toast({
        title: 'Success',
        description: 'Organizational group created successfully',
      })

      fetchGroups()
      setIsCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating group:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create group',
      })
    }
  }

  const handleEditGroup = (group: Group) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      displayName: group.displayName,
      description: group.description || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return

    try {
      const updateData = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description
      }

      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update group')
      }

      toast({
        title: 'Success',
        description: 'Organizational group updated successfully',
      })

      fetchGroups()
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error updating group:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update group',
      })
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this organizational group?')) {
      return
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete group')
      }

      toast({
        title: 'Success',
        description: 'Organizational group deleted successfully',
      })

      fetchGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete group',
      })
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: ''
    })
    setSelectedGroup(null)
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )



  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading organizational structure...</div>
  }

  return (
      <div className="container py-4 sm:py-6 mx-auto px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl font-bold">
            <Building className="w-6 h-6 sm:w-8 sm:h-8" />
            Organizational Groups
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Manage organizational structure and hierarchy levels.
            <span className="block sm:inline"> </span>
            <span className="text-xs sm:text-sm text-blue-600">Note: Permissions are now managed separately via Role system.</span>
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Organizational Group</DialogTitle>
              <DialogDescription>
                Create a new organizational group for company structure
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., manager"
                />
              </div>
              
              <div className="grid items-center grid-cols-4 gap-4">
                <Label htmlFor="displayName" className="text-right">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Manager"
                />
              </div>
              
              <div className="grid items-start grid-cols-4 gap-4">
                <Label htmlFor="description" className="text-right">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Role description and responsibilities"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup}>
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Groups</CardTitle>
          <CardDescription>
            Search organizational groups by name or display name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Organizational Groups ({filteredGroups.length})</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Company organizational structure and hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <Building className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No organizational groups found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {filteredGroups.map((group) => (
                  <div key={group.id} className="border rounded-lg p-3 sm:p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors">
                    {/* Group Header */}
                    <div className="space-y-1">
                      <div className="font-medium text-sm sm:text-base">{group.displayName}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{group.name}</div>
                    </div>

                    {/* Description */}
                    {group.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 pt-2 border-t">
                        {group.description}
                      </div>
                    )}

                    {/* Members and Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{group._count?.users || 0} members</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                          className="h-8 px-2 sm:px-3"
                        >
                          <Pencil className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.displayName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {group._count?.users || 0}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {group.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Organizational Group</DialogTitle>
            <DialogDescription>
              Modify organizational group details
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="edit-name" className="text-right">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3"
                placeholder="group-name (lowercase, no spaces)"
              />
            </div>

            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="edit-displayName" className="text-right">Display Name</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid items-start grid-cols-4 gap-4">
              <Label htmlFor="edit-description" className="text-right">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>
              Update Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  )
}

// Protect with ORGANIZATION_MANAGE capability (changed from role-based)
export default withAuth(GroupsManagementPage, {
  requiredCapabilities: ['ORGANIZATION_MANAGE']
});