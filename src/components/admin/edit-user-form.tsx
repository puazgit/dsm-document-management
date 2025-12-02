'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { User, Edit } from 'lucide-react'

interface Role {
  id: string
  name: string
  displayName: string
}

interface UserData {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  userRoles: {
    role: Role
  }[]
}

interface EditUserFormProps {
  user: UserData | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

interface EditUserFormData {
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  password: string
  confirmPassword: string
}

export function EditUserForm({ user, isOpen, onClose, onUpdate }: EditUserFormProps) {
  const [formData, setFormData] = useState<EditUserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    isActive: true,
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isActive: user.isActive,
        password: '',
        confirmPassword: ''
      })
    }
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    // Validation
    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    // Password validation (optional)
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Validation Error',
          description: 'Passwords do not match',
          variant: 'destructive',
        })
        return
      }
      
      if (formData.password.length < 6) {
        toast({
          title: 'Validation Error',
          description: 'Password must be at least 6 characters long',
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setLoading(true)
      
      // Prepare data - only include password if it's provided
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        isActive: formData.isActive
      }
      
      if (formData.password) {
        updateData.password = formData.password
      }
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update user')
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      
      onUpdate()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="mr-2 h-5 w-5" />
            Edit User
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Info Header */}
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">@{user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editFirstName">First Name *</Label>
              <Input
                id="editFirstName"
                value={formData.firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="editLastName">Last Name *</Label>
              <Input
                id="editLastName"
                value={formData.lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="editUsername">Username *</Label>
            <Input
              id="editUsername"
              value={formData.username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, username: e.target.value })}
              placeholder="johndoe"
              required
            />
          </div>

          <div>
            <Label htmlFor="editEmail">Email *</Label>
            <Input
              id="editEmail"
              type="email"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editPassword">New Password (optional)</Label>
              <Input
                id="editPassword"
                type="password"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty to keep current"
              />
            </div>
            <div>
              <Label htmlFor="editConfirmPassword">Confirm New Password</Label>
              <Input
                id="editConfirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="editIsActive">Account Status</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) => 
                  setFormData({ ...formData, isActive: checked })}
              />
              <span className="text-sm text-muted-foreground">
                {formData.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Current Roles Display */}
          <div>
            <Label>Current Roles</Label>
            <div className="mt-1 text-sm text-muted-foreground">
              {user.userRoles.length === 0 ? (
                'No roles assigned'
              ) : (
                user.userRoles.map(ur => ur.role.displayName).join(', ')
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Use "Manage Roles" to modify role assignments
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}