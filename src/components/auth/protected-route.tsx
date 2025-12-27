'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
  requiredCapabilities?: string[]
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [],
  requiredCapabilities = [],
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

    // Check capabilities (priority over roles)
    if (requiredCapabilities.length > 0) {
      const userCapabilities = session.user.capabilities || []
      const hasRequiredCapability = requiredCapabilities.some(cap => 
        userCapabilities.includes(cap)
      )
      
      if (!hasRequiredCapability) {
        console.warn('User lacks required capabilities:', requiredCapabilities)
        router.push('/unauthorized')
        return
      }
    }

    // Check permissions (this would need to be implemented when we have permissions in session)
    if (requiredPermissions.length > 0) {
      // TODO: Implement permission checking when permissions are added to session
      console.log('Permission checking not yet implemented:', requiredPermissions)
    }
  }, [session, status, router, requiredRoles, requiredPermissions, requiredCapabilities, redirectTo])

  // Show minimal loading - don't block UI for too long
  if (status === 'loading') {
    return null // Return null instead of spinner for faster perceived loading
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

  // Additional capability checking for render
  if (requiredCapabilities.length > 0) {
    const userCapabilities = session.user.capabilities || []
    const hasRequiredCapability = requiredCapabilities.some(cap => 
      userCapabilities.includes(cap)
    )
    
    if (!hasRequiredCapability) {
      return null // Will redirect
    }
  }

  return <>{children}</>
}