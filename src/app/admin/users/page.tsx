'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AddUserForm } from '@/components/admin/add-user-form'
import { UserRoleAssignment } from '@/components/admin/user-role-assignment'
import { UserGroupAssignment } from '@/components/admin/user-group-assignment'
import { EditUserForm } from '@/components/admin/edit-user-form'
import { useToast } from '@/hooks/use-toast'
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Ban,
  CheckCircle
} from 'lucide-react'

interface Role {
  id: string
  name: string
  displayName: string
  rolePermissions?: {
    id?: string
    permission?: {
      id: string
      name?: string
      displayName?: string
      action?: string
      module?: string
    }
    isGranted?: boolean
  }[]
}

interface Group {
  id: string
  name: string
  displayName: string
  description: string
  _count?: {
    users: number
  }
}

interface UserRole {
  role: {
    id: string
    name: string
    displayName: string
    description: string
    isSystem: boolean
  }
  assignedAt: string
}

interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
  userRoles: UserRole[]
  group?: {
    id: string
    name: string
    displayName: string
    description: string | null
    isActive: boolean
  }
  groupId?: string | null
}

interface UsersResponse {
  users: User[]
  page: number
  limit: number
  total: number
  totalPages: number
}

function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [selectedUserForRoles, setSelectedUserForRoles] = useState<User | null>(null)
  const [isRoleAssignmentOpen, setIsRoleAssignmentOpen] = useState(false)
  const [selectedUserForGroup, setSelectedUserForGroup] = useState<User | null>(null)
  const [isGroupAssignmentOpen, setIsGroupAssignmentOpen] = useState(false)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const { toast } = useToast()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null)
    if (openDropdownId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
    // Return void cleanup function for non-openDropdownId case
    return () => {};
  }, [openDropdownId])

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles?includePermissions=true', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Roles API Error:', response.status, errorText)
        throw new Error(`Roles API Error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched roles:', data)
      }
      setRoles(data)
    } catch (error) {
      console.error('Fetch roles error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch roles',
        variant: 'destructive',
      })
    }
  }, [])

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch('/api/groups?includeUsers=true', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Groups API Error:', response.status, errorText)
        throw new Error(`Groups API Error: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched groups:', data)
      }
      const groupsList = data.groups || data || []
      setGroups(groupsList)
    } catch (error) {
      console.error('Fetch groups error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch groups',
        variant: 'destructive',
      })
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm,
        ...(statusFilter !== 'all' && { isActive: statusFilter }),
        ...(roleFilter !== 'all' && { roleId: roleFilter }),
        ...(groupFilter !== 'all' && { groupId: groupFilter }),
      })

      const response = await fetch(`/api/users?${params}`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }
      
      const data: UsersResponse = await response.json()
      if (process.env.NODE_ENV === 'development') {
        console.log('Fetched users:', data)
      }
      setUsers(data.users)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Fetch users error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter, roleFilter, groupFilter])

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchGroups()
  }, [fetchUsers, fetchRoles, fetchGroups])

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) throw new Error('Failed to update user status')

      await fetchUsers()
      toast({
        title: 'Success',
        description: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      })
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast({
        title: 'Warning',
        description: 'Please select users first',
        variant: 'destructive',
      })
      return
    }

    // Special confirmation for delete action
    if (action === 'delete') {
      const isConfirmed = window.confirm(
        `Are you sure you want to permanently delete ${selectedUsers.length} selected user(s)?\n\nThis action cannot be undone and will remove all user data permanently.`
      )
      if (!isConfirmed) return
    }

    try {
      const promises = selectedUsers.map(userId => {
        switch (action) {
          case 'activate':
            return fetch(`/api/users/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ isActive: true }),
            })
          case 'deactivate':
            return fetch(`/api/users/${userId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ isActive: false }),
            })
          case 'delete':
            return fetch(`/api/users/${userId}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            })
          default:
            return Promise.resolve()
        }
      })

      await Promise.all(promises)
      await fetchUsers()
      setSelectedUsers([])
      
      toast({
        title: 'Success',
        description: `Bulk ${action} completed successfully`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to perform bulk ${action}`,
        variant: 'destructive',
      })
    }
  }

  const handleManageRoles = (user: User) => {
    setSelectedUserForRoles(user)
    setIsRoleAssignmentOpen(true)
  }

  const handleManageGroup = (user: User) => {
    setSelectedUserForGroup(user)
    setIsGroupAssignmentOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUserForEdit(user)
    setIsEditUserOpen(true)
  }

  const handleDeleteUser = async (user: User) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete user "${user.firstName} ${user.lastName}" (${user.email})?\n\nThis action cannot be undone and will permanently remove all user data.`
    )
    
    if (!isConfirmed) return

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }

      await fetchUsers()
      toast({
        title: 'Success',
        description: `User "${user.firstName} ${user.lastName}" has been permanently deleted`,
      })
    } catch (error) {
      console.error('Delete user error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: 'destructive',
      })
    }
  }

  const getRoleDisplayName = (user: User) => {
    return user.userRoles[0]?.role?.displayName || 'No Role'
  }

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin': return 'destructive'
      case 'manager': return 'default'
      case 'editor': return 'secondary'
      default: return 'outline'
    }
  }

  return (
      <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage users, roles, and permissions
            </p>
          </div>
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with basic information
                </DialogDescription>
              </DialogHeader>
              <AddUserForm 
                roles={roles}
                onSuccess={() => {
                  fetchUsers()
                  setIsAddUserDialogOpen(false)
                }}
                onCancel={() => {
                  setIsAddUserDialogOpen(false)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Registered users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Roles Assigned</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
              <p className="text-xs text-muted-foreground">
                Available roles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Groups</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{groups.length}</div>
              <p className="text-xs text-muted-foreground">
                User groups
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Users ({users.length})
            </CardTitle>
            <CardDescription>Search and filter users by name, email, role, or status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, or username..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && fetchUsers()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => fetchUsers()} size="default">
                  Search
                </Button>
              </div>

              {/* Filters Row */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table Card */}
        <Card>
          <CardContent className="p-3 sm:p-6">
            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                  >
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Activate
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                  >
                    <Ban className="mr-1 h-3 w-3" />
                    Deactivate
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4 mx-auto" />
                <p className="text-lg font-medium text-muted-foreground mb-1">No users found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3 bg-card hover:bg-muted/50 transition-colors">
                      {/* User Header with Checkbox */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                              }
                            }}
                            className="rounded cursor-pointer mt-1 flex-shrink-0"
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          variant={user.isActive ? 'default' : 'secondary'}
                          className="text-xs flex-shrink-0"
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Email */}
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="text-sm truncate">{user.email}</div>
                      </div>

                      {/* Role and Group */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Role</div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant={getRoleBadgeVariant(user.userRoles[0]?.role?.name || '')} className="text-xs">
                              {getRoleDisplayName(user)}
                            </Badge>
                            {user.userRoles.length > 1 && (
                              <span className="text-xs text-muted-foreground">
                                +{user.userRoles.length - 1}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Group</div>
                          {user.group ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 text-xs">
                              {user.group.displayName || user.group.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No group</span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(user.createdAt).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageRoles(user)}
                          className="text-xs h-8 flex-1"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Roles
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageGroup(user)}
                          className="text-xs h-8 flex-1"
                        >
                          <Users className="h-3 w-3 mr-1" />
                          Group
                        </Button>
                        <div className="relative">
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdownId(openDropdownId === user.id ? null : user.id)
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {openDropdownId === user.id && (
                            <div 
                              className="absolute right-0 mt-1 w-[160px] bg-white rounded-md shadow-lg border z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    handleEditUser(user)
                                    setOpenDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleStatusChange(user.id, !user.isActive)
                                    setOpenDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                >
                                  {user.isActive ? (
                                    <>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Activate
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteUser(user)
                                    setOpenDropdownId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[50px]">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers(users.map(u => u.id))
                              } else {
                                setSelectedUsers([])
                              }
                            }}
                            className="rounded cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="min-w-[180px]">User</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                        <TableHead className="min-w-[120px]">Role</TableHead>
                        <TableHead className="min-w-[120px]">Group</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Created</TableHead>
                        <TableHead className="min-w-[200px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user.id])
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                                }
                              }}
                              className="rounded cursor-pointer"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                {user.firstName[0]}{user.lastName[0]}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  @{user.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{user.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant={getRoleBadgeVariant(user.userRoles[0]?.role?.name || '')}>
                                {getRoleDisplayName(user)}
                              </Badge>
                              {user.userRoles.length > 1 && (
                                <span className="text-xs text-muted-foreground">
                                  +{user.userRoles.length - 1} more
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.group ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                {user.group.displayName || user.group.name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">No group</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.isActive ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManageRoles(user)}
                                className="text-xs h-8"
                                title="Manage Roles"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Roles
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManageGroup(user)}
                                className="text-xs h-8"
                                title="Manage Group"
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Group
                              </Button>
                              <div className="relative">
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(openDropdownId === user.id ? null : user.id)
                                  }}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                                {openDropdownId === user.id && (
                                  <div 
                                    className="absolute right-0 mt-1 w-[160px] bg-white rounded-md shadow-lg border z-50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          handleEditUser(user)
                                          setOpenDropdownId(null)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleManageRoles(user)
                                          setOpenDropdownId(null)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                      >
                                        <Shield className="mr-2 h-4 w-4" />
                                        Manage Roles
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleManageGroup(user)
                                          setOpenDropdownId(null)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                      >
                                        <Users className="mr-2 h-4 w-4" />
                                        Manage Group
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleStatusChange(user.id, !user.isActive)
                                          setOpenDropdownId(null)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                                      >
                                        {user.isActive ? (
                                          <>
                                            <Ban className="mr-2 h-4 w-4" />
                                            Deactivate
                                          </>
                                        ) : (
                                          <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Activate
                                          </>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleDeleteUser(user)
                                          setOpenDropdownId(null)
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Role Assignment Dialog */}
        <UserRoleAssignment
          user={selectedUserForRoles}
          isOpen={isRoleAssignmentOpen}
          onClose={() => {
            setIsRoleAssignmentOpen(false)
            setSelectedUserForRoles(null)
          }}
          onUpdate={() => {
            fetchUsers()
          }}
        />

        {/* User Group Assignment Dialog */}
        <UserGroupAssignment
          user={selectedUserForGroup}
          isOpen={isGroupAssignmentOpen}
          onClose={() => {
            setIsGroupAssignmentOpen(false)
            setSelectedUserForGroup(null)
          }}
          onUpdate={() => {
            fetchUsers()
          }}
        />

        {/* Edit User Dialog */}
        <EditUserForm
          user={selectedUserForEdit}
          isOpen={isEditUserOpen}
          onClose={() => {
            setIsEditUserOpen(false)
            setSelectedUserForEdit(null)
          }}
          onUpdate={() => {
            fetchUsers()
          }}
        />
      </div>
  )
}

// Export with authentication protection
export default withAuth(UsersManagementPage, {
  requiredCapabilities: ['USER_MANAGE'],
  redirectTo: '/unauthorized'
})