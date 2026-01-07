"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Building2, UserCircle, Calendar, Briefcase, Users } from "lucide-react"

interface SikawanUser {
  id: string
  username: string
  email: string
  name: string
  createdAt: string
  metadata: {
    jabatan?: string
    unit_kerja?: string
    nama_bidang?: string
    nama_subbidang?: string
  }
  currentRoles: string[]
}

interface Role {
  id: string
  name: string
  displayName: string
}

export default function SikawanUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<SikawanUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<SikawanUser | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [isAssigning, setIsAssigning] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  // Check authentication and authorization
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/unauthorized")
    }
  }, [status, session, router])

  // Load SIKAWAN users and roles
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "admin") {
      loadData()
    }
  }, [status, session])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load pending SIKAWAN users
      const usersRes = await fetch("/api/admin/sikawan-users")
      if (!usersRes.ok) throw new Error("Failed to load SIKAWAN users")
      const usersData = await usersRes.json()
      setUsers(usersData)

      // Load available roles
      const rolesRes = await fetch("/api/admin/roles")
      if (!rolesRes.ok) throw new Error("Failed to load roles")
      const rolesData = await rolesRes.json()
      setRoles(rolesData.filter((r: Role) => r.name !== 'viewer')) // Exclude viewer since they already have it
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "Failed to load SIKAWAN users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAssignDialog = (user: SikawanUser) => {
    setSelectedUser(user)
    setSelectedRole("")
    setShowDialog(true)
  }

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return

    setIsAssigning(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRole,
          isManuallyAssigned: true,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to assign role")
      }

      toast({
        title: "Success",
        description: `Role assigned to ${selectedUser.name}`,
      })

      // Reload data
      await loadData()
      setShowDialog(false)
      setSelectedUser(null)
      setSelectedRole("")
    } catch (error) {
      console.error("Error assigning role:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign role",
        variant: "destructive",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          SIKAWAN Users Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage roles for users who logged in via SIKAWAN
        </p>
      </div>

      {/* Info Card */}
      <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Building2 className="h-5 w-5" />
            About SIKAWAN Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200">
          <p className="mb-2">
            Users who log in via SIKAWAN are automatically assigned the <strong>Viewer</strong> role.
            Use this page to assign additional roles based on their responsibilities.
          </p>
          <p>
            <strong>Note:</strong> Role assignments here are manual and will not be automatically updated
            based on SIKAWAN data.
          </p>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>SIKAWAN Users ({users.length})</CardTitle>
          <CardDescription>
            Users who have logged in via SIKAWAN and currently have default roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No SIKAWAN users pending role assignment
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Users will appear here after their first login via SIKAWAN
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead>Current Roles</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <UserCircle className="h-8 w-8 text-gray-400 dark:text-gray-600 flex-shrink-0 mt-1" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              NIP: {user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="h-4 w-4 text-gray-400 dark:text-gray-600" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {user.metadata?.jabatan || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {user.metadata?.unit_kerja || "-"}
                        </div>
                        {user.metadata?.nama_bidang && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {user.metadata.nama_bidang}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.currentRoles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenAssignDialog(user)}
                        >
                          Assign Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role to User</DialogTitle>
            <DialogDescription>
              Assign a new role to {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              {/* User Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedUser.name}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                  <div>Email: {selectedUser.email}</div>
                  <div>NIP: {selectedUser.username}</div>
                  {selectedUser.metadata?.jabatan && (
                    <div>Jabatan: {selectedUser.metadata.jabatan}</div>
                  )}
                  {selectedUser.metadata?.unit_kerja && (
                    <div>Unit: {selectedUser.metadata.unit_kerja}</div>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                  <strong>Current roles:</strong>{" "}
                  {selectedUser.currentRoles.join(", ")}
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Select New Role
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.displayName} ({role.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
