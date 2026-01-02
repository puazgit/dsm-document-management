import { prisma } from '@/lib/prisma'
import * as Icons from 'lucide-react'

export interface NavItem {
  id: string
  title: string
  href: string
  icon: any
  description?: string
  requiredCapability?: string | null
  children?: NavItem[]
  sortOrder?: number
}

// Cache for navigation items
let cachedNavigation: NavItem[] | null = null
let cacheTime: number = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get all navigation items from database
 */
export async function getNavigationItems(): Promise<NavItem[]> {
  // Return cached data if still valid
  const now = Date.now()
  if (cachedNavigation && (now - cacheTime) < CACHE_TTL) {
    return cachedNavigation
  }

  const resources = await prisma.resource.findMany({
    where: {
      type: 'navigation',
      isActive: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  })

  // Build navigation tree
  const navMap = new Map<string, NavItem>()
  const rootItems: NavItem[] = []

  // First pass: create all items
  for (const resource of resources) {
    const iconName = resource.icon || 'Circle'
    const IconComponent = (Icons as any)[iconName] || Icons.Circle

    const navItem: NavItem = {
      id: resource.id,
      title: resource.name,
      href: resource.path,
      icon: IconComponent,
      description: resource.description || undefined,
      requiredCapability: resource.requiredCapability,
      sortOrder: resource.sortOrder || 0,
      children: [],
    }

    navMap.set(resource.id, navItem)

    // Add to root if no parent
    if (!resource.parentId) {
      rootItems.push(navItem)
    }
  }

  // Second pass: build parent-child relationships
  for (const resource of resources) {
    if (resource.parentId) {
      const parent = navMap.get(resource.parentId)
      const child = navMap.get(resource.id)
      if (parent && child) {
        parent.children = parent.children || []
        parent.children.push(child)
      }
    }
  }

  // Sort children by sortOrder
  for (const item of navMap.values()) {
    if (item.children && item.children.length > 0) {
      item.children.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    }
  }

  // Sort root items
  rootItems.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))

  // Clean up empty children arrays
  const cleanupChildren = (items: NavItem[]) => {
    for (const item of items) {
      if (item.children && item.children.length === 0) {
        delete item.children
      } else if (item.children) {
        cleanupChildren(item.children)
      }
    }
  }
  cleanupChildren(rootItems)

  // Update cache
  cachedNavigation = rootItems
  cacheTime = now

  return rootItems
}

/**
 * Filter navigation items based on user capabilities
 */
export function getFilteredNavigation(
  navigationItems: NavItem[],
  userCapabilities: string[] = []
): NavItem[] {
  const filterNavItems = (items: NavItem[]): NavItem[] => {
    return items
      .filter(item => {
        // Check capability requirements
        if (item.requiredCapability) {
          const hasCapability = userCapabilities.includes(item.requiredCapability)
          if (!hasCapability) {
            return false
          }
        }

        return true
      })
      .map(item => {
        // Recursively filter children
        if (item.children) {
          const filteredChildren = filterNavItems(item.children)
          
          // If item has no accessible children and children array was not empty, filter them out
          if (filteredChildren.length === 0) {
            const { children, ...itemWithoutChildren } = item
            return itemWithoutChildren
          }
          
          return {
            ...item,
            children: filteredChildren,
          }
        }

        return item
      })
  }

  return filterNavItems(navigationItems)
}

/**
 * Check if user can access a specific route
 */
export function canAccessRoute(
  navigationItems: NavItem[],
  href: string,
  userCapabilities: string[] = []
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

  // Check capability requirements
  if (navItem.requiredCapability) {
    const hasCapability = userCapabilities.includes(navItem.requiredCapability)
    if (!hasCapability) {
      return false
    }
  }

  return true
}

/**
 * Clear navigation cache (useful after updating resources)
 */
export function clearNavigationCache() {
  cachedNavigation = null
  cacheTime = 0
}
