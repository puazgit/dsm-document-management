'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, ReactNode } from 'react'
import { Capability } from '@/hooks/use-capabilities'

interface ProtectedRouteProps {
  children: ReactNode
  requiredCapabilities?: Capability[]
  requireAll?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requiredCapabilities = [],
  requireAll = false,
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

    // Check capabilities from session
    if (requiredCapabilities.length > 0) {
      const userCapabilities = (session.user as any).capabilities || []
      
      const hasRequiredCapabilities = requireAll
        ? requiredCapabilities.every(cap => userCapabilities.includes(cap))
        : requiredCapabilities.some(cap => userCapabilities.includes(cap))
      
      if (!hasRequiredCapabilities) {
        console.warn('User lacks required capabilities:', requiredCapabilities)
        router.push('/unauthorized')
        return
      }
    }
  }, [session, status, router, requiredCapabilities, requireAll, redirectTo])

  // Show minimal loading - don't block UI for too long
  if (status === 'loading') {
    return null // Return null instead of spinner for faster perceived loading
  }

  if (!session) {
    return null // Will redirect
  }

  // Additional capability checking for render
  if (requiredCapabilities.length > 0) {
    const userCapabilities = (session.user as any).capabilities || []
    
    const hasRequiredCapabilities = requireAll
      ? requiredCapabilities.every(cap => userCapabilities.includes(cap))
      : requiredCapabilities.some(cap => userCapabilities.includes(cap))
    
    if (!hasRequiredCapabilities) {
      return null // Will redirect
    }
  }

  return <>{children}</>
}