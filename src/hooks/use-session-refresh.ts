'use client'

import { signIn, useSession } from 'next-auth/react'
import { useCallback } from 'react'

/**
 * Hook to manually refresh session and reload permissions/capabilities from database
 * Useful after admin makes changes to user roles/permissions
 */
export function useSessionRefresh() {
  const { data: session } = useSession()

  const refreshSession = useCallback(async () => {
    try {
      if (!session?.user) {
        return false
      }

      // Force re-fetch session by calling the session endpoint
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        // Session will be updated on next page load
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to refresh session:', error)
      return false
    }
  }, [session])

  return { refreshSession }
}
