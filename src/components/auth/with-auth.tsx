'use client'

import { ComponentType } from 'react'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RoleGuard } from '@/components/auth/role-guard'

interface WithAuthOptions {
  requiredRoles?: string[]
  requiredPermissions?: string[]
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
        requiredRoles={options.requiredRoles}
        requiredPermissions={options.requiredPermissions}
        redirectTo={options.redirectTo}
      >
        <WrappedComponent {...props} />
      </ProtectedRoute>
    )
  }

  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return AuthenticatedComponent
}

// HOC for role-based component protection
export function withRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredRoles: string[],
  fallback?: ComponentType
) {
  const RoleProtectedComponent = (props: P) => {
    const FallbackComponent = fallback || (() => null)
    
    return (
      <RoleGuard 
        requiredRoles={requiredRoles}
        fallback={<FallbackComponent />}
      >
        <WrappedComponent {...props} />
      </RoleGuard>
    )
  }

  RoleProtectedComponent.displayName = `withRole(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return RoleProtectedComponent
}

// HOC for admin-only components
export function withAdminRole<P extends object>(
  WrappedComponent: ComponentType<P>,
  fallback?: ComponentType
) {
  return withRole(WrappedComponent, ['admin'], fallback)
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const { data: session } = useSession()
  
  const renderIfRole = (requiredRoles: string[], children: React.ReactNode) => {
    if (!session?.user) return null
    
    const userRole = session.user.role
    if (!requiredRoles.includes(userRole)) return null
    
    return children
  }

  const renderIfPermission = (requiredPermissions: string[], children: React.ReactNode) => {
    if (!session?.user) return null
    
    // TODO: Implement when permissions are added to session
    console.log('Permission checking not implemented:', requiredPermissions)
    return children
  }

  const renderIfAdmin = (children: React.ReactNode) => {
    return renderIfRole(['admin'], children)
  }

  return {
    renderIfRole,
    renderIfPermission,
    renderIfAdmin
  }
}