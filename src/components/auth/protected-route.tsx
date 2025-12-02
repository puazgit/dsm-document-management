'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [],
  redirectTo = '/auth/login'
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading

    if (!session) {
      router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }

    // Check roles
    if (requiredRoles.length > 0) {
      const userRole = session.user.role
      if (!requiredRoles.includes(userRole)) {
        router.push('/unauthorized')
        return
      }
    }

    // Check permissions (this would need to be implemented when we have permissions in session)
    if (requiredPermissions.length > 0) {
      // TODO: Implement permission checking when permissions are added to session
      console.log('Permission checking not yet implemented:', requiredPermissions)
    }
  }, [session, status, router, requiredRoles, requiredPermissions, redirectTo])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect
  }

  // Additional role checking for render
  if (requiredRoles.length > 0) {
    const userRole = session.user.role
    if (!requiredRoles.includes(userRole)) {
      return null // Will redirect
    }
  }

  return <>{children}</>
}