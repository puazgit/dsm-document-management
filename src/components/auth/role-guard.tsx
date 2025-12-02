'use client'

import { useSession } from 'next-auth/react'
import { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  requiredRoles: string[]
  fallback?: ReactNode
  requireAll?: boolean
}

export function RoleGuard({ 
  children, 
  requiredRoles, 
  fallback = null,
  requireAll = false 
}: RoleGuardProps) {
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

  const userRole = session.user.role

  const hasRole = requireAll
    ? requiredRoles.every(role => userRole === role)
    : requiredRoles.includes(userRole)

  if (!hasRole) {
    return fallback as JSX.Element
  }

  return <>{children}</>
}