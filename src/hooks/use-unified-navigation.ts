import { useState, useEffect } from 'react'
import { NavigationItem } from '@/lib/unified-access-control'

export function useUnifiedNavigation() {
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNavigation() {
      try {
        setLoading(true)
        // Add cache busting to force fresh data
        const response = await fetch('/api/navigation?_t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch navigation')
        }
        
        const data = await response.json()
        console.log('[useUnifiedNavigation] Fetched navigation items:', data.navigation?.length || 0)
        setNavigation(data.navigation || [])
      } catch (err) {
        console.error('[useUnifiedNavigation] Error fetching navigation:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchNavigation()
  }, [])

  return { navigation, loading, error }
}
