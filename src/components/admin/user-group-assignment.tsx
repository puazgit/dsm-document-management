'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  User,
  Building,
  AlertTriangle,
  Check,
  X
} from 'lucide-react'

interface Group {
  id: string
  name: string
  displayName: string
  description: string | null
  level: number
  isActive: boolean
  _count?: {
    users: number
  }
}

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  group?: Group
  groupId?: string | null
}

interface UserGroupAssignmentProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function UserGroupAssignment({ user, isOpen, onClose, onUpdate }: UserGroupAssignmentProps) {
  const [availableGroups, setAvailableGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { toast } = useToast()

  const fetchCurrentUser = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/users/${user.id}`)
      if (!response.ok) throw new Error('Failed to fetch user data')
      
      const userData = await response.json()
      setCurrentUser(userData.user || userData)
    } catch (error) {
      console.error('Error fetching current user:', error)
      setCurrentUser(user)
    }
  }

  const fetchAvailableGroups = async () => {
    const userToCheck = currentUser || user
    if (!userToCheck) return
    
    try {
      setLoading(true)
      console.log('📡 Fetching groups...')
      
      const response = await fetch('/api/groups')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error('Failed to fetch groups')
      }
      
      const data = await response.json()
      console.log('📋 Fetched groups data:', data)
      
      const allGroups: Group[] = data.groups || data || []
      console.log('✅ All groups:', allGroups.length, 'groups')
      
      // All groups are available for selection
      const filtered = allGroups.filter(group => 
        group.isActive && 
        group.id && 
        group.id.trim() !== ''
      )
      
      console.log('🔄 Filtered groups:', filtered.length, 'groups')
      setAvailableGroups(filtered)
    } catch (error) {
      console.error('💥 Error fetching groups:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch available groups',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      console.log('🔍 Dialog opened for user:', {
        email: user.email,
        currentGroupId: user.groupId,
        currentGroup: user.group?.name
      })
      setCurrentUser(user)
      fetchCurrentUser()
      setSelectedGroupId('')
    }
  }, [isOpen, user])

  useEffect(() => {
    if (currentUser) {
      fetchAvailableGroups()
    }
  }, [currentUser])

  const handleAssignGroup = async () => {
    if (!user || !selectedGroupId || selectedGroupId.trim() === '') {
      toast({
        title: 'Error',
        description: 'Please select a group',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/users/${user.id}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedGroupId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign group')
      }

      const result = await response.json()
      
      if (result.user) {
        setCurrentUser(result.user)
      } else {
        await fetchCurrentUser()
      }

      toast({
        title: 'Success',
        description: 'Group assigned successfully',
      })
      
      onUpdate()
      setSelectedGroupId('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign group',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveGroup = async () => {
    if (!user) return

    const userName = `${user.firstName} ${user.lastName}`
    if (!confirm(`Are you sure you want to remove ${userName} from their current organizational group?`)) {
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/users/${user.id}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: null }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to remove group')
      }

      const result = await response.json()
      
      if (result.user) {
        setCurrentUser(result.user)
      } else {
        await fetchCurrentUser()
      }

      toast({
        title: 'Success',
        description: 'User removed from organizational group',
      })
      
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove group',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getGroupBadgeVariant = (level: number) => {
    if (level >= 9) return 'destructive' // High level (Executive)
    if (level >= 7) return 'default'     // Middle level (Manager)
    if (level >= 5) return 'secondary'   // Senior level
    return 'outline'                     // Entry level
  }

  if (!isOpen || !user) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Organizational Group Assignment</span>
          </DialogTitle>
          <DialogDescription>
            Assign user to an organizational group to define their position in the company hierarchy
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{(currentUser || user)?.firstName} {(currentUser || user)?.lastName}</h3>
              <p className="text-sm text-muted-foreground">@{(currentUser || user)?.username} • {(currentUser || user)?.email}</p>
            </div>
          </div>

          {/* Current Group */}
          <div>
            <Label className="text-base font-medium">Current Organizational Group</Label>
            <div className="mt-2 space-y-2">
              {!(currentUser || user)?.group ? (
                <div className="flex items-center space-x-2 p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700">No organizational group assigned</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getGroupBadgeVariant((currentUser || user)?.group?.level || 0)}>
                      Level {(currentUser || user)?.group?.level}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{(currentUser || user)?.group?.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(currentUser || user)?.group?.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveGroup}
                    disabled={submitting}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Assign New Group */}
          <div>
            <Label className="text-base font-medium">Assign to Group</Label>
            <div className="mt-2 space-y-3">
              {loading ? (
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm text-muted-foreground">Loading available groups...</span>
                </div>
              ) : availableGroups.length === 0 ? (
                <div className="flex items-center space-x-2 p-3 border border-green-200 bg-green-50 rounded-lg">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">No groups available</span>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a group to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups
                        .sort((a, b) => b.level - a.level)
                        .map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getGroupBadgeVariant(group.level)} className="text-xs">
                                L{group.level}
                              </Badge>
                              <span>{group.displayName}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignGroup}
                    disabled={!selectedGroupId || submitting}
                    size="default"
                  >
                    {submitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      </div>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Assign
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}