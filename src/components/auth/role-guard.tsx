'use client'

import { ReactNode } from 'react'
import { CapabilityGuard, Capability } from '@/hooks/use-capabilities'

interface RoleGuardProps {
  children: ReactNode
  requiredCapabilities?: Capability[]
  anyOf?: Capability[]
  allOf?: Capability[]
  fallback?: ReactNode
}

/**
 * RoleGuard migrated to use capabilities
 * Use CapabilityGuard directly for new code
 */
export function RoleGuard({ 
  children, 
  requiredCapabilities,
  anyOf,
  allOf,
  fallback = null
}: RoleGuardProps) {
  // Delegate to CapabilityGuard
  return (
    <CapabilityGuard
      capability={requiredCapabilities?.[0]}
      anyOf={anyOf || (requiredCapabilities && requiredCapabilities.length > 1 ? requiredCapabilities : undefined)}
      allOf={allOf}
      fallback={fallback}
    >
      {children}
    </CapabilityGuard>
  )
}

// Re-export CapabilityGuard for direct use
export { CapabilityGuard } from '@/hooks/use-capabilities'