'use client'

import { useEffect, useState } from 'react'

export function LoadingOptimizer() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Preload critical resources
    const preloadResources = async () => {
      try {
        // Hide content during initial load
        document.documentElement.style.visibility = 'hidden'
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
          await new Promise(resolve => {
            document.addEventListener('DOMContentLoaded', resolve, { once: true })
          })
        }

        // Small delay to prevent flash
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Show content
        document.documentElement.style.visibility = 'visible'
        setIsReady(true)
      } catch (error) {
        // Fallback: show content anyway
        document.documentElement.style.visibility = 'visible'
        setIsReady(true)
      }
    }

    preloadResources()
  }, [])

  // Don't render anything, this is just for side effects
  return null
}