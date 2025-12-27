/**
 * Unified Access Control Service
 * 
 * Single source of truth for all access control decisions in the system.
 * Handles navigation visibility, route protection, and API endpoint access.
 * 
 * Features:
 * - Database-driven access control
 * - Capability-based authorization
 * - Caching for performance
 * - Type-safe resource definitions
 */

import { PrismaClient } from '@prisma/client'
import { LRUCache } from 'lru-cache'

const prisma = new PrismaClient()

// Cache configuration
const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
})

// ========================
// TYPE DEFINITIONS
// ========================

export interface NavigationItem {
  id: string
  path: string
  name: string
  icon?: string
  sortOrder: number
  children?: NavigationItem[]
}

export interface RouteAccess {
  path: string
  requiredCapability: string | null
  isAccessible: boolean
}

export interface ApiAccess {
  path: string
  method: string
  requiredCapability: string | null
  isAccessible: boolean
}

// ========================
// CORE SERVICE CLASS
// ========================

export class UnifiedAccessControl {
  /**
   * Get all capabilities for a user based on their roles
   */
  static async getUserCapabilities(userId: string): Promise<string[]> {
    const cacheKey = `user-capabilities:${userId}`
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    // Query database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                capabilityAssignments: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    
    if (!user) return []
    
    // Collect unique capabilities from all user's roles
    const capabilities = new Set<string>()
    
    for (const userRole of user.userRoles) {
      for (const assignment of userRole.role.capabilityAssignments) {
        capabilities.add(assignment.capability.name)
      }
    }
    
    const result = Array.from(capabilities)
    
    // Cache result
    cache.set(cacheKey, result)
    
    return result
  }
  
  /**
   * Check if user has a specific capability
   */
  static async hasCapability(
    userId: string,
    capabilityName: string
  ): Promise<boolean> {
    const capabilities = await this.getUserCapabilities(userId)
    return capabilities.includes(capabilityName)
  }
  
  /**
   * Get navigation items visible to user
   */
  static async getNavigationForUser(userId: string): Promise<NavigationItem[]> {
    const cacheKey = `user-navigation:${userId}`
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    // Get user capabilities
    const capabilities = await this.getUserCapabilities(userId)
    
    // Get all navigation resources
    const navResources = await prisma.resource.findMany({
      where: {
        type: 'navigation',
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    })
    
    // Filter by capabilities
    const accessibleResources = navResources.filter((resource) => {
      // If no capability required, accessible to all
      if (!resource.requiredCapability) return true
      
      // Check if user has required capability
      return capabilities.includes(resource.requiredCapability)
    })
    
    // Build hierarchical structure
    const result = this.buildNavigationTree(accessibleResources)
    
    // Cache result
    cache.set(cacheKey, result)
    
    return result
  }
  
  /**
   * Build hierarchical navigation tree
   */
  private static buildNavigationTree(resources: any[]): NavigationItem[] {
    const itemsMap = new Map<string, NavigationItem>()
    const rootItems: NavigationItem[] = []
    
    // First pass: create all items
    for (const resource of resources) {
      const item: NavigationItem = {
        id: resource.id,
        path: resource.path,
        name: resource.name,
        icon: resource.icon || undefined,
        sortOrder: resource.sortOrder,
        children: [],
      }
      itemsMap.set(resource.id, item)
    }
    
    // Second pass: build tree structure
    for (const resource of resources) {
      const item = itemsMap.get(resource.id)!
      
      if (resource.parentId) {
        const parent = itemsMap.get(resource.parentId)
        if (parent) {
          parent.children!.push(item)
        }
      } else {
        rootItems.push(item)
      }
    }
    
    // Remove empty children arrays
    const cleanChildren = (item: NavigationItem) => {
      if (item.children && item.children.length === 0) {
        delete item.children
      } else if (item.children) {
        item.children.forEach(cleanChildren)
      }
    }
    
    rootItems.forEach(cleanChildren)
    
    return rootItems
  }
  
  /**
   * Check if user can access a specific route
   */
  static async canAccessRoute(
    userId: string,
    path: string
  ): Promise<boolean> {
    // Get user capabilities
    const capabilities = await this.getUserCapabilities(userId)
    
    // Find matching route resource
    const route = await prisma.resource.findFirst({
      where: {
        type: 'route',
        path: path,
        isActive: true,
      },
    })
    
    // If no route definition found, deny access
    if (!route) return false
    
    // If no capability required, allow access
    if (!route.requiredCapability) return true
    
    // Check if user has required capability
    return capabilities.includes(route.requiredCapability)
  }
  
  /**
   * Check if user can access a specific API endpoint
   */
  static async canAccessAPI(
    userId: string,
    path: string,
    method: string
  ): Promise<boolean> {
    // Get user capabilities
    const capabilities = await this.getUserCapabilities(userId)
    
    // Find matching API resource
    const api = await prisma.resource.findFirst({
      where: {
        type: 'api',
        path: path,
        isActive: true,
        metadata: {
          path: ['method'],
          equals: method.toUpperCase(),
        },
      },
    })
    
    // If no API definition found, deny access
    if (!api) return false
    
    // If no capability required, allow access
    if (!api.requiredCapability) return true
    
    // Check if user has required capability
    return capabilities.includes(api.requiredCapability)
  }
  
  /**
   * Get all accessible routes for a user
   */
  static async getAccessibleRoutes(userId: string): Promise<RouteAccess[]> {
    const cacheKey = `user-routes:${userId}`
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    const capabilities = await this.getUserCapabilities(userId)
    
    const routes = await prisma.resource.findMany({
      where: {
        type: 'route',
        isActive: true,
      },
    })
    
    const result = routes.map((route) => ({
      path: route.path,
      requiredCapability: route.requiredCapability,
      isAccessible:
        !route.requiredCapability ||
        capabilities.includes(route.requiredCapability),
    }))
    
    // Cache result
    cache.set(cacheKey, result)
    
    return result
  }
  
  /**
   * Get all accessible API endpoints for a user
   */
  static async getAccessibleAPIs(userId: string): Promise<ApiAccess[]> {
    const cacheKey = `user-apis:${userId}`
    
    // Check cache
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    const capabilities = await this.getUserCapabilities(userId)
    
    const apis = await prisma.resource.findMany({
      where: {
        type: 'api',
        isActive: true,
      },
    })
    
    const result = apis.map((api) => ({
      path: api.path,
      method: (api.metadata as any)?.method || 'GET',
      requiredCapability: api.requiredCapability,
      isAccessible:
        !api.requiredCapability ||
        capabilities.includes(api.requiredCapability),
    }))
    
    // Cache result
    cache.set(cacheKey, result)
    
    return result
  }
  
  /**
   * Clear cache for a specific user
   */
  static clearUserCache(userId: string) {
    cache.delete(`user-capabilities:${userId}`)
    cache.delete(`user-navigation:${userId}`)
    cache.delete(`user-routes:${userId}`)
    cache.delete(`user-apis:${userId}`)
  }
  
  /**
   * Clear all cache
   */
  static clearAllCache() {
    cache.clear()
  }
}

// ========================
// CONVENIENCE FUNCTIONS
// ========================

/**
 * Get navigation items for user (convenience wrapper)
 */
export async function getNavigationForUser(
  userId: string
): Promise<NavigationItem[]> {
  return UnifiedAccessControl.getNavigationForUser(userId)
}

/**
 * Check route access (convenience wrapper)
 */
export async function canAccessRoute(
  userId: string,
  path: string
): Promise<boolean> {
  return UnifiedAccessControl.canAccessRoute(userId, path)
}

/**
 * Check API access (convenience wrapper)
 */
export async function canAccessAPI(
  userId: string,
  path: string,
  method: string
): Promise<boolean> {
  return UnifiedAccessControl.canAccessAPI(userId, path, method)
}

/**
 * Get user capabilities (convenience wrapper)
 */
export async function getUserCapabilities(userId: string): Promise<string[]> {
  return UnifiedAccessControl.getUserCapabilities(userId)
}
