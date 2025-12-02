'use client'

import React, { useState, useEffect } from 'react'
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
  level: number
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
  level: number
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
    description: '',
    level: 0
  })

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups')
      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }
      const groupsData = await response.json()
      setGroups(Array.isArray(groupsData) ? groupsData : [])
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
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleCreateGroup = async () => {
    try {
      const createData = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        level: formData.level
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
      description: group.description || '',
      level: group.level
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return

    try {
      const updateData = {
        displayName: formData.displayName,
        description: formData.description,
        level: formData.level
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
      description: '',
      level: 0
    })
    setSelectedGroup(null)
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getLevelBadgeColor = (level: number) => {
    if (level >= 9) return 'bg-red-500 hover:bg-red-600'
    if (level >= 7) return 'bg-orange-500 hover:bg-orange-600'
    if (level >= 5) return 'bg-yellow-500 hover:bg-yellow-600'
    if (level >= 3) return 'bg-blue-500 hover:bg-blue-600'
    return 'bg-gray-500 hover:bg-gray-600'
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading organizational structure...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building className="h-8 w-8" />
            Organizational Groups
          </h1>
          <p className="text-gray-600 mt-2">
            Manage organizational structure and hierarchy levels
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., manager"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="displayName" className="text-right">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g., Manager"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="level" className="text-right">Level</Label>
                <Input
                  id="level"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
                  className="col-span-3"
                  placeholder="0-10"
                />
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
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
          <CardTitle>Organizational Groups ({filteredGroups.length})</CardTitle>
          <CardDescription>
            Company organizational structure and hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No organizational groups found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups
                  .sort((a, b) => b.level - a.level)
                  .map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell>{group.displayName}</TableCell>
                      <TableCell>
                        <Badge className={getLevelBadgeColor(group.level)}>
                          Level {group.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
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
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-displayName" className="text-right">Display Name</Label>
              <Input
                id="edit-displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-level" className="text-right">Level</Label>
              <Input
                id="edit-level"
                type="number"
                min="0"
                max="10"
                value={formData.level}
                onChange={(e) => setFormData({...formData, level: parseInt(e.target.value)})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
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

export default GroupsManagementPage