import { 
  Home, 
  FileText, 
  Users, 
  Shield, 
  Settings, 
  UserPlus,
  BarChart3,
  Activity,
  Archive
} from 'lucide-react'
import { hasRoleAccess } from '@/config/roles'

export interface NavItem {
  title: string
  href: string
  icon: any
  description?: string
  requiredRoles?: string[]
  requiredPermissions?: string[]
  children?: NavItem[]
}

export const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and analytics'
  },
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    description: 'Manage documents',
    children: [
      {
        title: 'All Documents',
        href: '/documents',
        icon: Archive,
      },
      {
        title: 'Upload Document',
        href: '/documents/upload',
        icon: UserPlus,
        requiredPermissions: ['documents.create']
      }
    ]
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: Users,
    description: 'Your profile settings'
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    description: 'Administrative functions',
    requiredRoles: ['admin', 'org_administrator'],
    children: [
      {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
        requiredRoles: ['admin', 'org_administrator', 'org_ppd']
      },
      {
        title: 'Group Management',
        href: '/admin/groups',
        icon: Users,
        requiredRoles: ['administrator', 'admin', 'org_administrator']
      },
      {
        title: 'Role Management',
        href: '/admin/roles',
        icon: Shield,
        requiredRoles: ['administrator', 'admin', 'org_administrator']
      },
      {
        title: 'Permissions',
        href: '/admin/permissions',
        icon: Shield,
        requiredRoles: ['administrator', 'admin', 'org_administrator']
      },
      {
        title: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
        requiredRoles: ['administrator', 'admin', 'org_administrator']
      },
      {
        title: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: Activity,
        requiredRoles: ['administrator', 'admin', 'org_administrator']
      }
    ]
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Reports and analytics',
    requiredRoles: ['administrator', 'admin', 'org_administrator', 'manager', 'org_manager', 'org_kadiv']
  }
]

export function getFilteredNavigation(userRole: string, userPermissions: string[] = []): NavItem[] {
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Check role requirements using role hierarchy
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        const canAccess = hasRoleAccess(userRole, item.requiredRoles)
        if (!canAccess) {
          return false
        }
      }

      // Check permission requirements  
      if (item.requiredPermissions && item.requiredPermissions.length > 0) {
        // Check for wildcard permissions (admin)
        if (userPermissions.includes('*')) {
          // Admin has all permissions
        } else {
          const hasPermission = item.requiredPermissions.some(permission => {
            // Check exact permission
            if (userPermissions.includes(permission)) return true
            
            // Check module wildcard (e.g., "documents.*" covers "documents.create")
            const [module] = permission.split('.')
            if (userPermissions.includes(`${module}.*`)) return true
            
            return false
          })
          
          if (!hasPermission) {
            return false
          }
        }
      }

      // Recursively filter children
      if (item.children) {
        const filteredChildren = filterNavItems(item.children)
        item.children = filteredChildren
        
        // If item has no accessible children and no direct href, hide it
        if (filteredChildren.length === 0 && item.href === '#') {
          return false
        }
      }

      return true
    })
  }

  return filterNavItems(navigationItems)
}

// Helper function to check if user can access a specific route
export function canAccessRoute(
  href: string, 
  userRole: string, 
  userPermissions: string[] = []
): boolean {
  const findNavItem = (items: NavItem[], targetHref: string): NavItem | null => {
    for (const item of items) {
      if (item.href === targetHref) {
        return item
      }
      if (item.children) {
        const found = findNavItem(item.children, targetHref)
        if (found) return found
      }
    }
    return null
  }

  const navItem = findNavItem(navigationItems, href)
  
  if (!navItem) {
    return true // If route not found in nav, allow access (might be public)
  }

  // Check role requirements
  if (navItem.requiredRoles && navItem.requiredRoles.length > 0) {
    if (!navItem.requiredRoles.includes(userRole)) {
      return false
    }
  }

  // Check permission requirements
  if (navItem.requiredPermissions && navItem.requiredPermissions.length > 0) {
    const hasPermission = navItem.requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    )
    if (!hasPermission) {
      return false
    }
  }

  return true
}