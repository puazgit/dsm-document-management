'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getFilteredNavigation, NavItem } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface NavigationMenuProps {
  className?: string
}

const EXPANDED_ITEMS_KEY = 'navigation-expanded-items'

export function NavigationMenu({ className }: NavigationMenuProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Load expanded state from localStorage on mount
  useEffect(() => {
    if (!session?.user) return
    
    try {
      const saved = localStorage.getItem(EXPANDED_ITEMS_KEY)
      if (saved) {
        setExpandedItems(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load navigation state:', error)
    }
  }, [session?.user])

  // Auto-expand parent items when child is active
  useEffect(() => {
    if (!session?.user) return

    const userRole = session.user.role
    const userPermissions: string[] = [] // TODO: Get from session when permissions are added
    const navigationItems = getFilteredNavigation(userRole, userPermissions)

    const findParentOfActivePath = (items: NavItem[], currentPath: string, parentHref?: string): string | null => {
      for (const item of items) {
        if (item.children) {
          // Check if any child matches the current path
          const childMatch = item.children.some(child => 
            currentPath === child.href || currentPath.startsWith(child.href + '/')
          )
          if (childMatch) {
            return parentHref || item.href
          }
        }
      }
      return null
    }

    const activeParent = findParentOfActivePath(navigationItems, pathname)
    if (activeParent && !expandedItems.includes(activeParent)) {
      setExpandedItems(prev => {
        const newItems = [...prev, activeParent]
        try {
          localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify(newItems))
        } catch (error) {
          console.warn('Failed to save navigation state:', error)
        }
        return newItems
      })
    }
  }, [pathname, expandedItems, session?.user])

  if (!session?.user) {
    return null
  }

  const userRole = session.user.role
  const userPermissions: string[] = [] // TODO: Get from session when permissions are added
  
  const navigationItems = getFilteredNavigation(userRole, userPermissions)



  const toggleExpanded = (href: string) => {
    setExpandedItems(prev => {
      const newExpanded = prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
      
      // Save to localStorage
      try {
        localStorage.setItem(EXPANDED_ITEMS_KEY, JSON.stringify(newExpanded))
      } catch (error) {
        console.warn('Failed to save navigation state:', error)
      }
      
      return newExpanded
    })
  }

  const isExpanded = (href: string) => expandedItems.includes(href)
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const itemIsActive = isActive(item.href)
    const itemIsExpanded = isExpanded(item.href)

    // Check if any child is currently active
    const hasActiveChild = hasChildren && item.children?.some(child => isActive(child.href))

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
            (itemIsActive || hasActiveChild) && "bg-accent text-accent-foreground",
            level > 0 && "ml-4"
          )}
        >
          {hasChildren ? (
            <div className="flex w-full items-center justify-between">
              {/* Make the text area clickable for navigation if it has a direct href */}
              <div 
                className="flex items-center flex-1 cursor-pointer"
                onClick={() => {
                  // Navigate to parent href if it's not just a container
                  if (item.href !== '/admin') {
                    window.location.href = item.href
                  }
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </div>
              {/* Separate toggle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(item.href)
                }}
                className="p-1 hover:bg-accent-foreground/10 rounded"
              >
                {itemIsExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          ) : (
            <Link href={item.href} className="flex w-full items-center">
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          )}
        </div>

        {hasChildren && itemIsExpanded && (
          <div className="mt-1 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <nav className={cn("space-y-2", className)}>
      {navigationItems.map(item => renderNavItem(item))}
    </nav>
  )
}