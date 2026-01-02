'use client'

import { ComponentType } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { CapabilityGuard, Capability, useCapabilities } from '@/hooks/use-capabilities'

interface WithAuthOptions {
  requiredCapabilities?: Capability[]
  requireAll?: boolean
  redirectTo?: string
  fallback?: ComponentType
}

// HOC for route-level protection
export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const AuthenticatedComponent = (props: P) => {
    return (
      <ProtectedRoute
        requiredCapabilities={options.requiredCapabilities}
        requireAll={options.requireAll}
        redirectTo={options.redirectTo}
      >
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return AuthenticatedComponent
}

// HOC for capability-based component protection
export function withCapability<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredCapabilities: Capability[],
  fallback?: ComponentType
) {
  const CapabilityProtectedComponent = (props: P) => {
    const FallbackComponent = fallback || (() => null)
    
    return (
      <CapabilityGuard 
        anyOf={requiredCapabilities}
        fallback={<FallbackComponent />}
      >
        <WrappedComponent {...props} />
      </CapabilityGuard>
    )
  }

  CapabilityProtectedComponent.displayName = `withCapability(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return CapabilityProtectedComponent
}

// HOC for admin-only components
export function withAdminCapability<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ComponentType
) {
  return withCapability(WrappedComponent, ['USER_MANAGE', 'ROLE_MANAGE'], fallback)
}

// Hook for conditional rendering based on capabilities
export function useConditionalRender() {
  const { hasCapability, hasAnyCapability } = useCapabilities()
  
  const renderIfCapability = (capability: Capability, children: React.ReactNode) => {
    if (!hasCapability(capability)) return null
    return children
  }

  const renderIfAnyCapability = (capabilities: Capability[], children: React.ReactNode) => {
    if (!hasAnyCapability(capabilities)) return null
    return children
  }

  const renderIfAdmin = (children: React.ReactNode) => {
    return renderIfAnyCapability(['USER_MANAGE', 'ROLE_MANAGE'], children)
  }

  return {
    renderIfCapability,
    renderIfAnyCapability,
    renderIfAdmin
  }
}