'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, 
  Plus, 
  X,
  User,
  AlertTriangle,
  Check
} from 'lucide-react'

interface Role {
  id: string
  name: string
  displayName: string
  description: string
  isSystem: boolean
}

interface UserRole {
  role: Role
  assignedAt: string
}

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  userRoles: UserRole[]
}

interface UserRoleAssignmentProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function UserRoleAssignment({ user, isOpen, onClose, onUpdate }: UserRoleAssignmentProps) {
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const { toast } = useToast()

  const fetchCurrentUser = async () => {
    if (!user) return
    
    try {
      const response = await fetch(`/api/users/${user.id}/roles`)
      if (!response.ok) throw new Error('Failed to fetch user data')
      
      const userData = await response.json()
      setCurrentUser(userData.user || user)
    } catch (error) {
      console.error('Error fetching current user:', error)
      // Fallback to provided user data
      setCurrentUser(user)
    }
  }

  const fetchAvailableRoles = async () => {
    console.log('🔍 fetchAvailableRoles called, user:', currentUser || user)
    const userToCheck = currentUser || user
    if (!userToCheck) return
    
    try {
      setLoading(true)
      console.log('📡 Calling /api/roles...')
      
      const response = await fetch('/api/roles')
      
      console.log('📋 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error('Failed to fetch roles')
      }
      
      const allRoles: Role[] = await response.json()
      console.log('✅ Fetched roles:', allRoles)
      
      // Filter out roles that user already has and ensure valid IDs
      const userRoleIds = userToCheck.userRoles.map(ur => ur.role.id).filter(Boolean)
      const available = allRoles.filter(role => 
        role.id && 
        role.id.trim() !== '' && 
        !userRoleIds.includes(role.id)
      )
      
      console.log('🔄 Available roles after filtering:', available)
      setAvailableRoles(available)
    } catch (error) {
      console.error('💥 fetchAvailableRoles error:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch available roles',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && user) {
      setCurrentUser(user)
      fetchCurrentUser()
      setSelectedRoleId('')
    }
  }, [isOpen, user])

  useEffect(() => {
    if (currentUser) {
      fetchAvailableRoles()
    }
  }, [currentUser])

  const handleAssignRole = async () => {
    if (!user || !selectedRoleId || selectedRoleId.trim() === '') return

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: selectedRoleId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to assign role')
      }

      const result = await response.json()
      
      // Update current user with the returned updated data
      if (result.user) {
        setCurrentUser(result.user)
      } else {
        // Fallback: refresh user data if no updated data returned
        await fetchCurrentUser()
      }

      toast({
        title: 'Success',
        description: 'Role assigned successfully',
      })
      
      onUpdate()
      setSelectedRoleId('')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevokeRole = async (roleId: string, roleName: string) => {
    if (!user) return

    if (!confirm(`Are you sure you want to revoke the "${roleName}" role from ${user.firstName} ${user.lastName}?`)) {
      return
    }

    try {
      setSubmitting(true)
      
      const response = await fetch(`/api/users/${user.id}/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to revoke role')
      }

      const result = await response.json()
      
      // Update current user with the returned updated data if available
      if (result.user) {
        setCurrentUser(result.user)
      } else {
        // Fallback: refresh user data if no updated data returned
        await fetchCurrentUser()
      }

      toast({
        title: 'Success',
        description: 'Role revoked successfully',
      })
      
      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke role',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'editor': return 'secondary'
      default: return 'outline'
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Manage User Roles
          </DialogTitle>
          <DialogDescription>
            Assign or revoke functional roles to control user permissions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center p-4 space-x-3 rounded-lg bg-muted">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">{(currentUser || user)?.firstName} {(currentUser || user)?.lastName}</h3>
              <p className="text-sm text-muted-foreground">@{(currentUser || user)?.username} • {(currentUser || user)?.email}</p>
            </div>
          </div>

          {/* Current Roles */}
          <div>
            <Label className="text-base font-medium">Current Roles</Label>
            <div className="mt-2 space-y-2">
              {(currentUser || user)?.userRoles.length === 0 ? (
                <div className="flex items-center p-3 space-x-2 border border-orange-200 rounded-lg bg-orange-50">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-700">No roles assigned</span>
                </div>
              ) : (
                (currentUser || user)?.userRoles.map((userRole) => (
                  <div key={userRole.role.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant={getRoleBadgeVariant(userRole.role.name)}>
                        {userRole.role.displayName}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{userRole.role.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {userRole.role.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assigned: {new Date(userRole.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!userRole.role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeRole(userRole.role.id, userRole.role.displayName)}
                        disabled={submitting}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assign New Role */}
          <div>
            <Label className="text-base font-medium">Assign New Role</Label>
            <div className="mt-2 space-y-3">
              {loading ? (
                <div className="flex items-center p-3 space-x-2 border rounded-lg">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin border-primary border-t-transparent" />
                  <span className="text-sm text-muted-foreground">Loading available roles...</span>
                </div>
              ) : availableRoles.length === 0 ? (
                <div className="flex items-center p-3 space-x-2 border border-green-200 rounded-lg bg-green-50">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">All available roles are already assigned</span>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Select value={selectedRoleId || ''} onValueChange={(value) => setSelectedRoleId(value || '')}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a role to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles
                        .filter(role => role.id && role.id.trim() !== '')
                        .map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div>
                            <div className="font-medium">{role.displayName}</div>
                            <div className="text-xs text-muted-foreground">{role.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAssignRole}
                    disabled={!selectedRoleId || submitting}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Assign
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* System Role Warning */}
          {user.userRoles.some(ur => ur.role.isSystem) && (
            <div className="flex items-start p-3 space-x-2 border border-blue-200 rounded-lg bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">System Role Notice</p>
                <p>System roles cannot be revoked through this interface for security reasons.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}