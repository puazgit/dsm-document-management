"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Users,
  Settings,
  Shield,
  BarChart3,
  Activity,
  LogOut,
  UserCircle,
  Upload,
  Key,
  ChevronRight,
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
import { getFilteredNavigation } from "../lib/navigation"
import { useState, useEffect } from "react"

const SIDEBAR_OPEN_ITEMS_KEY = 'sidebar-open-items'

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [openItems, setOpenItems] = useState<string[]>([])

  // Load open state from localStorage on mount
  useEffect(() => {
    if (!session?.user) return
    
    try {
      const saved = localStorage.getItem(SIDEBAR_OPEN_ITEMS_KEY)
      if (saved) {
        setOpenItems(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error)
    }
  }, [session?.user])

  // Auto-open parent items when child is active  
  useEffect(() => {
    if (!session?.user) return

    const userRole = session.user.role || 'user'
    const userPermissions: string[] = [] // TODO: Get from session when permissions are added
    const navigationItems = getFilteredNavigation(userRole, userPermissions)

    const findParentOfActivePath = (items: any[], currentPath: string) => {
      for (const item of items) {
        if (item.children) {
          const childMatch = item.children.some((child: any) => 
            currentPath === child.href || currentPath.startsWith(child.href + '/')
          )
          if (childMatch) {
            return item.title
          }
        }
      }
      return null
    }

    const activeParent = findParentOfActivePath(navigationItems, pathname)
    if (activeParent) {
      setOpenItems(prev => {
        const newItems = prev.includes(activeParent) ? prev : [...prev, activeParent]
        try {
          localStorage.setItem(SIDEBAR_OPEN_ITEMS_KEY, JSON.stringify(newItems))
        } catch (error) {
          console.warn('Failed to save sidebar state:', error)
        }
        return newItems
      })
    }
  }, [pathname, session?.user])

  if (!session?.user) return null

  const userRole = session.user.role || 'user'
  const userPermissions: string[] = [] // TODO: Get from session when permissions are added
  
  const navigationItems = getFilteredNavigation(userRole, userPermissions)

  const toggleItem = (href: string) => {
    setOpenItems(prev => {
      const newOpenItems = prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
      
      try {
        localStorage.setItem(SIDEBAR_OPEN_ITEMS_KEY, JSON.stringify(newOpenItems))
      } catch (error) {
        console.warn('Failed to save sidebar state:', error)
      }
      
      return newOpenItems
    })
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <FileText className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">DSM</span>
                  <span className="truncate text-xs">Document Management</span>
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
            <SidebarMenu>
              {navigationItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0
                const isItemOpen = openItems.includes(item.href)
                
                return (
                  <div key={item.href}>
                    <SidebarMenuItem>
                      {hasChildren ? (
                        <SidebarMenuButton 
                          tooltip={item.title}
                          isActive={isActive(item.href)}
                          onClick={() => toggleItem(item.href)}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRight className={`ml-auto transition-transform ${isItemOpen ? 'rotate-90' : ''}`} />
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton 
                          tooltip={item.title} 
                          asChild 
                          isActive={isActive(item.href)}
                        >
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                    
                    {hasChildren && isItemOpen && (
                      <SidebarMenuSub>
                        {item.children?.map((child) => (
                          <SidebarMenuSubItem key={child.href}>
                            <SidebarMenuSubButton 
                              asChild
                              isActive={isActive(child.href)}
                            >
                              <Link href={child.href}>
                                <child.icon />
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </div>
                )
              })}
            </SidebarMenu>
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
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt={session.user.name || "User"} />
                    <AvatarFallback className="rounded-lg">
                      {session.user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{session.user.name}</span>
                    <span className="truncate text-xs">{session.user.email}</span>
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
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: window.location.origin + "/auth/login" })}>
                  <LogOut className="h-4 w-4" />
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