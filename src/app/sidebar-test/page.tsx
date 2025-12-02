'use client'

import { getFilteredNavigation, NavItem } from '../../lib/navigation'

export default function SidebarTestPage() {
  const testRole = 'administrator'
  const testPermissions: string[] = []
  
  const navigationItems = getFilteredNavigation(testRole, testPermissions)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Sidebar Navigation Test</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Test Role: {testRole}</h2>
        <h3 className="text-md mb-2">Navigation Items ({navigationItems.length} total):</h3>
      </div>

      <div className="space-y-2">
        {navigationItems.map((item: NavItem, index: number) => (
          <div key={index} className="border p-3 rounded">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-600">{item.href}</div>
            <div className="text-xs text-gray-500">
              Required Roles: {item.requiredRoles?.join(', ') || 'None'}
            </div>
            {item.children && item.children.length > 0 && (
              <div className="mt-2 ml-4">
                <div className="text-sm font-medium">Children:</div>
                {item.children.map((child: NavItem, childIndex: number) => (
                  <div key={childIndex} className="text-sm text-gray-600 ml-2">
                    • {child.title} ({child.href})
                    {child.requiredRoles && (
                      <span className="text-xs text-gray-500">
                        {' '}- Roles: {child.requiredRoles.join(', ')}
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