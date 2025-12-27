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
        const response = await fetch('/api/navigation')
        
        if (!response.ok) {
          throw new Error('Failed to fetch navigation')
        }
        
        const data = await response.json()
        setNavigation(data.navigation || [])
      } catch (err) {
        console.error('Error fetching navigation:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchNavigation()
  }, [])

  return { navigation, loading, error }
}
