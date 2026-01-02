"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LogOut,
  UserCircle,
  Settings,
  Users,
  FileText,
  ChevronRight,
  Circle,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "./ui/sidebar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { useState, useEffect } from "react"
import { useUnifiedNavigation } from "@/hooks/use-unified-navigation"
import { getIconComponent } from "@/lib/icon-mapper"
import { getRoleConfig } from "../config/roles"
import { CapabilityGuard } from "@/hooks/use-capabilities"

// Helper function to get role display with icon
// Sanitized to prevent information leakage
function getRoleDisplay(role: string): string {
  if (!role || typeof role !== 'string') {
    return '👤 User'
  }
  
  // Normalize role name
  const normalizedRole = role.toLowerCase().trim()
  
  const roleIcons: Record<string, string> = {
    admin: '🔧 Admin',
    administrator: '🔧 Administrator',
    'ppd.pusat': '📋 PPD Pusat',
    'ppd.unit': '📋 PPD Unit',
    kadiv: '👔 Kadiv',
    gm: '🏢 GM',
    manager: '📊 Manager',
    dirut: '🎯 Dirut',
    dewas: '👥 Dewas',
    komite_audit: '🔍 Komite Audit',
    staff: '👤 Staff',
    guest: '👁️ Guest',
    viewer: '👁️ Viewer'
  }
  
  // Return mapped role or generic user label
  return roleIcons[normalizedRole] || '👤 User'
}

const SIDEBAR_OPEN_ITEMS_KEY = 'sidebar-open-items'

export function AppSidebarUnified() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])
  const { navigation, loading, error } = useUnifiedNavigation()

  // Debug logging
  useEffect(() => {
    if (session?.user) {
      console.log('[AppSidebarUnified] Session:', session.user.email)
      console.log('[AppSidebarUnified] Navigation items:', navigation.length)
      console.log('[AppSidebarUnified] Loading:', loading, 'Error:', error)
    }
  }, [session, navigation, loading, error])

  // Load open state from localStorage on mount
  useEffect(() => {
    if (!session?.user) return
    
    try {
      const saved = localStorage.getItem(SIDEBAR_OPEN_ITEMS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Validate parsed data is array of strings
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          setOpenItems(parsed)
        } else {
          console.warn('Invalid sidebar state format, resetting')
          localStorage.removeItem(SIDEBAR_OPEN_ITEMS_KEY)
        }
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error)
      localStorage.removeItem(SIDEBAR_OPEN_ITEMS_KEY)
    }
  }, [session?.user])

  // Auto-open parent items when child is active (including nested)
  useEffect(() => {
    if (!session?.user || !navigation.length) return

    const findAllParentsOfActivePath = (items: any[], currentPath: string, parents: string[] = []): string[] => {
      for (const item of items) {
        if (item.path === currentPath || currentPath.startsWith(item.path + '/')) {
          return [...parents, item.id]
        }
        if (item.children) {
          // Check if any child matches
          const childMatch = item.children.some((child: any) => 
            child.path === currentPath || currentPath.startsWith(child.path + '/')
          )
          if (childMatch) {
            // Recursively find parents in children
            const childParents = findAllParentsOfActivePath(item.children, currentPath, [...parents, item.id])
            if (childParents.length > 0) {
              return childParents
            }
          }
        }
      }
      return parents
    }

    const allParents = findAllParentsOfActivePath(navigation, pathname)
    if (allParents.length > 0) {
      setOpenItems(prev => {
        const newItems = [...new Set([...prev, ...allParents])]
        try {
          localStorage.setItem(SIDEBAR_OPEN_ITEMS_KEY, JSON.stringify(newItems))
        } catch (error) {
          console.warn('Failed to save sidebar state:', error)
        }
        return newItems
      })
    }
  }, [pathname, session?.user, navigation])

  if (!session?.user) return null

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newOpenItems = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
      
      try {
        localStorage.setItem(SIDEBAR_OPEN_ITEMS_KEY, JSON.stringify(newOpenItems))
      } catch (error) {
        console.warn('Failed to save sidebar state:', error)
      }
      
      return newOpenItems
    })
  }

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex items-center justify-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
                  <FileText className="size-4" />
                </div>
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-semibold truncate">DSMT</span>
                  <span className="text-xs truncate">Dokumen Sistem Manajemen Terpadu</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading && (
              <div className="flex items-center justify-center p-4">
                <Circle className="w-4 h-4 animate-spin" />
                <span className="ml-2 text-sm">Loading navigation...</span>
              </div>
            )}
            
            {error && (
              <div className="p-4 text-sm text-destructive">
                Failed to load navigation
              </div>
            )}
            
            {!loading && !error && (
              <SidebarMenu>
                {navigation.map((item) => {
                  const hasChildren = item.children && item.children.length > 0
                  const isItemOpen = openItems.includes(item.id)
                  const Icon = getIconComponent(item.icon)
                  
                  return (
                    <div key={item.id}>
                      <SidebarMenuItem>
                        {hasChildren ? (
                          <SidebarMenuButton 
                            tooltip={item.name}
                            isActive={isActive(item.path)}
                            onClick={() => toggleItem(item.id)}
                          >
                            <Icon />
                            <span>{item.name}</span>
                            <ChevronRight className={`ml-auto transition-transform ${isItemOpen ? 'rotate-90' : ''}`} />
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton 
                            tooltip={item.name} 
                            asChild 
                            isActive={isActive(item.path)}
                          >
                            <Link href={item.path}>
                              <Icon />
                              <span>{item.name}</span>
                            </Link>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                      
                      {hasChildren && isItemOpen && (
                        <SidebarMenuSub>
                          {item.children?.map((child) => {
                            const ChildIcon = getIconComponent(child.icon)
                            const hasGrandChildren = child.children && child.children.length > 0
                            const isChildOpen = openItems.includes(child.id)
                            
                            return (
                              <div key={child.id}>
                                <SidebarMenuSubItem>
                                  {hasGrandChildren ? (
                                    <SidebarMenuSubButton 
                                      isActive={isActive(child.path)}
                                      onClick={() => toggleItem(child.id)}
                                    >
                                      <ChildIcon className="w-4 h-4" />
                                      <span>{child.name}</span>
                                      <ChevronRight className={`ml-auto transition-transform ${isChildOpen ? 'rotate-90' : ''}`} />
                                    </SidebarMenuSubButton>
                                  ) : (
                                    <SidebarMenuSubButton 
                                      asChild
                                      isActive={isActive(child.path)}
                                    >
                                      <Link href={child.path}>
                                        <ChildIcon className="w-4 h-4" />
                                        <span>{child.name}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  )}
                                </SidebarMenuSubItem>
                                
                                {hasGrandChildren && isChildOpen && (
                                  <SidebarMenuSub className="ml-4">
                                    {child.children?.map((grandChild) => {
                                      const GrandChildIcon = getIconComponent(grandChild.icon)
                                      return (
                                        <SidebarMenuSubItem key={grandChild.id}>
                                          <SidebarMenuSubButton 
                                            asChild
                                            isActive={isActive(grandChild.path)}
                                          >
                                            <Link href={grandChild.path}>
                                              <GrandChildIcon className="w-4 h-4" />
                                              <span>{grandChild.name}</span>
                                            </Link>
                                          </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                      )
                                    })}
                                  </SidebarMenuSub>
                                )}
                              </div>
                            )
                          })}
                        </SidebarMenuSub>
                      )}
                    </div>
                  )
                })}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="w-8 h-8 rounded-lg">
                    <AvatarImage src="" alt={session.user.name || "User"} />
                    <AvatarFallback className="rounded-lg">
                      {session.user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-sm leading-tight text-left">
                    <span className="font-semibold truncate">{session.user.name}</span>
                    <span className="text-xs truncate">{session.user.email}</span>
                    <span className="truncate text-[10px] text-muted-foreground font-medium">
                      {getRoleDisplay((session.user as any).role || 'guest')}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserCircle className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <CapabilityGuard anyOf={['ADMIN_ACCESS', 'SYSTEM_CONFIG']}>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/settings">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </CapabilityGuard>
                <CapabilityGuard anyOf={['USER_VIEW', 'USER_MANAGE']}>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users">
                      <Users className="w-4 h-4" />
                      Users
                    </Link>
                  </DropdownMenuItem>
                </CapabilityGuard>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth/login" })}>
                  <LogOut className="w-4 h-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
