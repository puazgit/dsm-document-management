import * as LucideIcons from 'lucide-react'
import { LucideIcon } from 'lucide-react'

/**
 * Map icon name strings to Lucide Icon components
 */
export function getIconComponent(iconName?: string): LucideIcon {
  if (!iconName) {
    console.log('[icon-mapper] No icon name provided, using Circle')
    return LucideIcons.Circle
  }
  
  // Map string names to Lucide components
  const icon = (LucideIcons as any)[iconName]
  
  console.log(`[icon-mapper] Looking for icon: "${iconName}"`, {
    found: !!icon,
    type: typeof icon,
    isFunction: typeof icon === 'function',
    isObject: typeof icon === 'object'
  })
  
  // Lucide icons can be functions or objects
  if (!icon) {
    console.warn(`[icon-mapper] Icon "${iconName}" not found, using Circle`)
    return LucideIcons.Circle
  }
  
  // Accept both function and object types (Lucide exports both)
  if (typeof icon !== 'function' && typeof icon !== 'object') {
    console.warn(`[icon-mapper] Icon "${iconName}" has invalid type: ${typeof icon}, using Circle`)
    return LucideIcons.Circle
  }
  
  return icon as LucideIcon
}

/**
 * Icon mappings for common navigation items
 */
export const iconMappings: Record<string, string> = {
  dashboard: 'LayoutDashboard',
  documents: 'FileText',
  admin: 'Settings',
  users: 'Users',
  roles: 'Shield',
  permissions: 'Key',
  analytics: 'BarChart3',
  audit: 'Activity',
  organizations: 'Building2',
  profile: 'User',
}
