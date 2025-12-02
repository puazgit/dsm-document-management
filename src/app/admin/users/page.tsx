'use client'

import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
  level: number
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
    level: number
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
  const { toast } = useToast()

  const fetchRoles = async () => {
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
  }

  const fetchGroups = async () => {
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
      setGroups(data)
    } catch (error) {
      console.error('Fetch groups error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch groups',
        variant: 'destructive',
      })
    }
  }

  const fetchUsers = async () => {
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
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchGroups()
  }, [currentPage, searchTerm, statusFilter, roleFilter, groupFilter])

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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
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

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Users ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[150px]">
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

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedUsers.length} user(s) selected
                </span>
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
            )}

            {/* Users Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
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
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              @{user.username}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
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
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {user.group.displayName || user.group.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">No group</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageRoles(user)}
                              className="text-xs"
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Roles
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageGroup(user)}
                              className="text-xs"
                            >
                              <Users className="h-3 w-3 mr-1" />
                              Group
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageRoles(user)}>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Manage Roles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageGroup(user)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  Manage Group
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(user.id, !user.isActive)}
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
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
    </DashboardLayout>
  )
}

// Export with authentication protection
export default withAuth(UsersManagementPage, {
  requiredRoles: ['administrator', 'admin', 'org_administrator', 'ppd'],
  redirectTo: '/unauthorized'
})