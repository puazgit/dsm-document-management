'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  Check
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
  const { toast } = useToast()

  const fetchAvailableGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/groups?includeUsers=true')
      if (!response.ok) throw new Error('Failed to fetch groups')
      
      const allGroups: Group[] = await response.json()
      
      // All groups are available for assignment (organizational structure)
      // Filter for active groups with valid IDs
      setAvailableGroups(allGroups.filter(group => 
        group.isActive && 
        group.id && 
        group.id.trim() !== ''
      ))
    } catch (error) {
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
      fetchAvailableGroups()
      // Set current group as selected if user has one
      setSelectedGroupId(user.groupId || '__no_group__')
    }
  }, [isOpen, user])

  const handleAssignGroup = async () => {
    if (!user) return

    // Validate selectedGroupId if it's not empty
    if (selectedGroupId && selectedGroupId.trim() === '') {
      toast({
        title: 'Error',
        description: 'Invalid group selection',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/users/${user.id}/group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          groupId: selectedGroupId === '__no_group__' ? null : selectedGroupId // null to remove from group
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to update group assignment')
      }

      const actionMessage = selectedGroupId && selectedGroupId !== '__no_group__'
        ? 'User assigned to organizational group successfully'
        : 'User removed from organizational group successfully'

      toast({
        title: 'Success',
        description: actionMessage,
      })
      
      onUpdate()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group assignment',
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
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-3 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{user.firstName} {user.lastName}</h3>
              <p className="text-sm text-muted-foreground">@{user.username} • {user.email}</p>
            </div>
          </div>

          {/* Current Group */}
          <div>
            <Label className="text-base font-medium">Current Organizational Group</Label>
            <div className="mt-2">
              {!user.group ? (
                <div className="flex items-center space-x-2 p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm text-orange-700">No organizational group assigned</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={getGroupBadgeVariant(user.group.level)}>
                      Level {user.group.level}
                    </Badge>
                    <div>
                      <p className="text-sm font-medium">{user.group.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.group.name}
                      </p>
                      {user.group.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.group.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Members: {user.group._count?.users || 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Group Assignment */}
          <div>
            <Label className="text-base font-medium">Assign to Organizational Group</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Groups define organizational hierarchy and structure (not functional permissions)
            </p>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organizational group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__no_group__">
                      <div className="text-gray-500">No group (remove assignment)</div>
                    </SelectItem>
                    {availableGroups
                      .filter(group => group.id && group.id.trim() !== '')
                      .sort((a, b) => b.level - a.level) // Sort by level desc
                      .map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getGroupBadgeVariant(group.level)} className="text-xs">
                            L{group.level}
                          </Badge>
                          <div>
                            <div className="font-medium">{group.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {group.name} • {group._count?.users || 0} members
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedGroupId && selectedGroupId !== '__no_group__' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Group Assignment Preview</p>
                        <p>
                          User will be assigned to organizational group: 
                          <strong> {availableGroups.find(g => g.id === selectedGroupId)?.displayName}</strong>
                        </p>
                        <p className="text-xs mt-1">
                          This affects organizational structure only. 
                          Functional permissions are managed separately through Roles.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignGroup}
            disabled={submitting || loading}
            className="min-w-[100px]"
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              selectedGroupId ? 'Assign Group' : 'Remove Group'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}