/**
 * Unified Middleware Helper
 * 
 * Helper functions for integrating UnifiedAccessControl with Next.js middleware
 * Note: We cannot directly use Prisma in middleware (Edge Runtime limitation)
 * So we provide utility functions that work with token data
 */

import { PrismaClient } from '@prisma/client'

// For use in API routes or server components (not edge middleware)
const prisma = new PrismaClient()

/**
 * Check if a route is protected and get its required capability
 * This is called from API routes, not directly in middleware
 */
export async function getRouteRequirements(path: string): Promise<{
  isProtected: boolean
  requiredCapability: string | null
}> {
  const route = await prisma.resource.findFirst({
    where: {
      type: 'route',
      path: path,
      isActive: true,
    },
  })
  
  if (!route) {
    return {
      isProtected: false,
      requiredCapability: null,
    }
  }
  
  return {
    isProtected: true,
    requiredCapability: route.requiredCapability,
  }
}

/**
 * Build a map of routes for middleware use
 * This should be called at build time or cached
 */
export async function buildRouteMap(): Promise<Record<string, string | null>> {
  const routes = await prisma.resource.findMany({
    where: {
      type: 'route',
      isActive: true,
    },
    select: {
      path: true,
      requiredCapability: true,
    },
  })
  
  const routeMap: Record<string, string | null> = {}
  
  for (const route of routes) {
    routeMap[route.path] = route.requiredCapability
  }
  
  return routeMap
}

/**
 * Check if user has required capability based on their roles
 * This works with token data from NextAuth JWT
 */
export async function userHasCapability(
  userId: string,
  capabilityName: string
): Promise<boolean> {
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
  
  if (!user) return false
  
  // Check if user has the required capability through any of their roles
  for (const userRole of user.userRoles) {
    const hasCapability = userRole.role.capabilityAssignments.some(
      (assignment) => assignment.capability.name === capabilityName
    )
    
    if (hasCapability) return true
  }
  
  return false
}
