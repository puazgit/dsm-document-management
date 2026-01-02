'use client'

import { useState, useEffect } from 'react'
import { getNavigationItems, getFilteredNavigation, NavItem } from '../../lib/navigation-db'

export default function SidebarTestPage() {
  const [navigationItems, setNavigationItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const testCapabilities = ['ADMIN_ACCESS', 'DOCUMENT_VIEW', 'USER_MANAGE']

  useEffect(() => {
    const loadNav = async () => {
      try {
        const allItems = await getNavigationItems()
        const filtered = getFilteredNavigation(allItems, testCapabilities)
        setNavigationItems(filtered)
      } catch (error) {
        console.error('Failed to load navigation:', error)
      } finally {
        setLoading(false)
      }
    }
    loadNav()
  }, [])

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sidebar Navigation Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Test Capabilities: {testCapabilities.join(', ')}</h2>
        <h3 className="text-md mb-2">Navigation Items ({navigationItems.length} total):</h3>
      </div>

      <div className="space-y-2">
        {navigationItems.map((item: NavItem, index: number) => (
          <div key={index} className="border p-3 rounded">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-600">{item.href}</div>
            <div className="text-xs text-gray-500">
              Required Capability: {item.requiredCapability || 'None'}
            </div>
            {item.children && item.children.length > 0 && (
              <div className="mt-2 ml-4">
                <div className="text-sm font-medium">Children:</div>
                {item.children.map((child: NavItem, childIndex: number) => (
                  <div key={childIndex} className="text-sm text-gray-600 ml-2">
                    • {child.title} ({child.href})
                    {child.requiredCapabilities && child.requiredCapabilities.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {' '}- Capabilities: {child.requiredCapabilities.join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}