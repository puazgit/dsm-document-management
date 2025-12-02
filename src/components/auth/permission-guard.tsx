'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'

interface PermissionGuardProps {
  children: ReactNode
  requiredPermissions: string[]
  fallback?: ReactNode
  requireAll?: boolean // true = require ALL permissions, false = require ANY permission
}

export function PermissionGuard({ 
  children, 
  requiredPermissions, 
  fallback = null,
  requireAll = false 
}: PermissionGuardProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session?.user) {
    return fallback as JSX.Element
  }

  const userPermissions = (session.user as any).permissions as string[] || []

  const hasPermission = requireAll
    ? requiredPermissions.every(permission => userPermissions.includes(permission))
    : requiredPermissions.some(permission => userPermissions.includes(permission))

  if (!hasPermission) {
    return fallback as JSX.Element
  }

  return <>{children}</>
}

// Hook for checking permissions in components
export function usePermissions() {
  const { data: session } = useSession()
  
  const userPermissions = (session?.user as any)?.permissions as string[] || []
  
  const hasPermission = (permission: string | string[], requireAll = false): boolean => {
    if (typeof permission === 'string') {
      return userPermissions.includes(permission)
    }
    
    return requireAll
      ? permission.every(p => userPermissions.includes(p))
      : permission.some(p => userPermissions.includes(p))
  }

  const hasRole = (role: string): boolean => {
    const userRole = session?.user?.role
    return userRole === role
  }

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasPermission('admin.access')
  }

  return {
    userPermissions,
    hasPermission,
    hasRole,
    isAdmin,
    user: session?.user
  }
}