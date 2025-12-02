'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface Role {
  id: string
  name: string
  displayName: string
}

interface AddUserFormProps {
  roles: Role[]
  onSuccess: () => void
  onCancel: () => void
}

interface UserFormData {
  username: string
  email: string
  firstName: string
  lastName: string
  password: string
  confirmPassword: string
  roleId: string
}

export function AddUserForm({ roles, onSuccess, onCancel }: AddUserFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    roleId: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.username || !formData.email || !formData.firstName || 
        !formData.lastName || !formData.password || !formData.roleId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Validation Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          roleId: formData.roleId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create user')
      }

      toast({
        title: 'Success',
        description: 'User created successfully',
      })
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        roleId: ''
      })
      
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setFormData({ ...formData, username: e.target.value })}
          placeholder="johndoe"
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setFormData({ ...formData, email: e.target.value })}
          placeholder="john@example.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="role">Role *</Label>
        <Select value={formData.roleId} onValueChange={(value: string) => 
          setFormData({ ...formData, roleId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}