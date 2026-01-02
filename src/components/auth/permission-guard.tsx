'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'
import { useCapabilities, Capability } from '@/hooks/use-capabilities'

interface PermissionGuardProps {
  children: ReactNode
  requiredCapabilities: Capability[]
  fallback?: ReactNode
  requireAll?: boolean // true = require ALL capabilities, false = require ANY capability
}

export function PermissionGuard({ 
  children, 
  requiredCapabilities, 
  fallback = null,
  requireAll = false 
}: PermissionGuardProps) {
  const { hasAnyCapability, hasAllCapabilities } = useCapabilities()
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const hasPermission = requireAll
    ? hasAllCapabilities(requiredCapabilities)
    : hasAnyCapability(requiredCapabilities)

  if (!hasPermission) {
    return fallback as JSX.Element
  }

  return <>{children}</>
}

// Hook for checking capabilities in components (re-export from use-capabilities)
export { useCapabilities as usePermissions } from '@/hooks/use-capabilities'