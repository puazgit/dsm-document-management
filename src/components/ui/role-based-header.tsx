/**
 * 🎨 Role-Based Header Component
 * 
 * Dynamic header that adapts based on user role and permissions
 */

'use client'

import { useSession } from 'next-auth/react'
import { Badge } from './badge'
import { Button } from './button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Bell, Search, Settings, Shield, Users, BarChart3, Upload, Plus } from 'lucide-react'
import { useRoleVisibility, RoleGuard, FeatureToggle } from '../../hooks/use-role-visibility'
import Link from 'next/link'

export function Header() {
  const { data: session } = useSession()
  const roleVisibility = useRoleVisibility()

  if (!session?.user) return null

  const getRoleBadgeColor = () => {
    if (roleVisibility.isAdmin) return 'bg-red-100 text-red-800 hover:bg-red-200'
    if (roleVisibility.isManager) return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    if (roleVisibility.isGuest) return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    return 'bg-green-100 text-green-800 hover:bg-green-200'
  }

  const getRoleIcon = () => {
    if (roleVisibility.isAdmin) return '🔧'
    if (roleVisibility.isManager) return '📋'
    if (roleVisibility.isGuest) return '👁️'
    return '👤'
  }

  return (
    <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Left: Page title and breadcrumb */}
      <div className="flex items-center gap-4 flex-1">
        <div>
          <h1 className="text-lg font-semibold">Document Management</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session.user.name || session.user.email}
          </p>
        </div>

        {/* Role indicator badge */}
        <Badge variant="outline" className={getRoleBadgeColor()}>
          <span className="mr-1">{getRoleIcon()}</span>
          {roleVisibility.isAdmin ? 'Administrator' : 
           roleVisibility.isManager ? 'Manager' : 
           roleVisibility.isGuest ? 'Guest' : 'User'}
        </Badge>
      </div>

      {/* Center: Quick search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search documents..."
            className="w-full rounded-md border border-input bg-background pl-8 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Right: Action buttons and user menu */}
      <div className="flex items-center gap-2">
        
        {/* Quick Upload Button */}
        <FeatureToggle feature="canUpload">
          <Button variant="outline" size="sm" asChild>
            <Link href="/documents/upload">
              <Plus className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Upload</span>
            </Link>
          </Button>
        </FeatureToggle>

        {/* Admin Quick Access */}
        <RoleGuard requiredRoles={['admin', 'org_administrator']}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Admin</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RoleGuard>

        {/* Analytics Access */}
        <FeatureToggle feature="canViewAnalytics">
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Analytics</span>
            </Link>
          </Button>
        </FeatureToggle>

        {/* Notifications */}
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
          {/* Notification badge for managers and admins */}
          {!roleVisibility.isGuest && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          )}
        </Button>

        {/* User permissions summary (for debugging/admin) */}
        {roleVisibility.isAdmin && (
          <div className="hidden lg:flex items-center text-xs text-muted-foreground">
            <Shield className="h-3 w-3 mr-1" />
            {session.user.permissions?.length || 0} permissions
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * Simplified header for guest users
 */
export function GuestHeader() {
  const { data: session } = useSession()
  
  if (!session?.user) return null

  return (
    <header className="flex h-12 items-center gap-4 border-b bg-background px-6">
      <div className="flex items-center gap-2 flex-1">
        <h1 className="text-sm font-medium">Document Viewer</h1>
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          👁️ Guest Access
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {session.user.name || session.user.email}
        </span>
      </div>
    </header>
  )
}

/**
 * Context-aware header that switches based on user role
 */
export function AdaptiveHeader() {
  const roleVisibility = useRoleVisibility()
  
  return roleVisibility.isGuest ? <GuestHeader /> : <Header />
}