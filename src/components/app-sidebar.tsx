"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  useSidebar,
} from "./ui/sidebar"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { getNavigationItems, getFilteredNavigation, NavItem } from "../lib/navigation-db"
import { useState, useEffect } from "react"
import { useRoleVisibility } from "../hooks/use-role-visibility"
import { CapabilityGuard } from "../hooks/use-capabilities"
import { getRoleConfig } from "../config/roles"

// Helper function to get role display with icon
function getRoleDisplay(role: string): string {
  if (!role || typeof role !== 'string') {
    return '👤 User'
  }
  
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
  
  // Check for exact match first
  if (roleIcons[normalizedRole]) {
    return roleIcons[normalizedRole]
  }
  
  // Check if role contains any of the keywords
  if (normalizedRole.includes('admin')) return '🔧 Admin'
  if (normalizedRole.includes('ppd')) return '📋 PPD'
  if (normalizedRole.includes('kadiv')) return '👔 Kadiv'
  if (normalizedRole.includes('gm') || normalizedRole.includes('general manager')) return '🏢 GM'
  if (normalizedRole.includes('manager')) return '📊 Manager'
  if (normalizedRole.includes('dirut') || normalizedRole.includes('direktur')) return '🎯 Dirut'
  if (normalizedRole.includes('dewas') || normalizedRole.includes('dewan')) return '👥 Dewas'
  if (normalizedRole.includes('komite') || normalizedRole.includes('audit')) return '🔍 Komite'
  if (normalizedRole.includes('staff')) return '👤 Staff'
  if (normalizedRole.includes('guest')) return '👁️ Guest'
  if (normalizedRole.includes('viewer') || normalizedRole.includes('view')) return '👁️ Viewer'
  
  // Fallback to role config
  const roleConfig = getRoleConfig(role)
  const displayName = roleConfig?.description?.split(' ')[0] || role
  
  return `👤 ${displayName}`
}

const SIDEBAR_OPEN_ITEMS_KEY = 'sidebar-open-items'

export function AppSidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [openItems, setOpenItems] = useState<string[]>([])
  const roleVisibility = useRoleVisibility()
  const { isMobile, setOpenMobile } = useSidebar()

  // Handler untuk close sidebar di mobile setelah navigasi
  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    console.log('[AppSidebar] Link clicked:', { href, isMobile })
    if (isMobile) {
      console.log('[AppSidebar] Mobile detected - closing sidebar')
      e.preventDefault()
      setOpenMobile(false)
      // Navigate setelah sidebar mulai close
      setTimeout(() => {
        router.push(href)
      }, 150)
    }
  }

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

  const [navigationItems, setNavigationItems] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load navigation from database
  useEffect(() => {
    if (!session?.user) return

    const loadNavigation = async () => {
      try {
        const allNavItems = await getNavigationItems()
        const userCapabilities = (session.user as any).capabilities || []
        const filtered = getFilteredNavigation(allNavItems, userCapabilities)
        setNavigationItems(filtered)
      } catch (error) {
        console.error('Failed to load navigation:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNavigation()
  }, [session?.user])

  // Auto-open parent items when child is active  
  useEffect(() => {
    if (!session?.user || navigationItems.length === 0) return

    const findParentOfActivePath = (items: NavItem[], currentPath: string) => {
      for (const item of items) {
        if (item.children) {
          const childMatch = item.children.some((child: NavItem) => 
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
  }, [pathname, session?.user, navigationItems])

  if (!session?.user || loading) return null

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
                <div className="flex items-center justify-center rounded-lg aspect-square size-8 bg-sidebar-primary text-sidebar-primary-foreground">
                  <FileText className="size-4" />
                </div>
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-semibold truncate">DSMT</span>
                  <span className="text-xs truncate">Dokumen Sistem Manajemen<p></p>Terpadu</span>
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
                          <Link 
                            href={item.href}
                            onClick={(e) => handleLinkClick(item.href, e)}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                    
                    {hasChildren && isItemOpen && (
                      <SidebarMenuSub>
                        {item.children?.map((child) => {
                          const hasGrandChildren = child.children && child.children.length > 0
                          const isChildOpen = openItems.includes(child.href)
                          
                          return (
                            <div key={child.href}>
                              <SidebarMenuSubItem>
                                {hasGrandChildren ? (
                                  <SidebarMenuSubButton
                                    isActive={isActive(child.href)}
                                    onClick={() => toggleItem(child.href)}
                                  >
                                    <child.icon />
                                    <span>{child.title}</span>
                                    <ChevronRight className={`ml-auto transition-transform ${isChildOpen ? 'rotate-90' : ''}`} />
                                  </SidebarMenuSubButton>
                                ) : (
                                  <SidebarMenuSubButton 
                                    asChild
                                    isActive={isActive(child.href)}
                                  >
                                    <Link 
                                      href={child.href}
                                      onClick={(e) => handleLinkClick(child.href, e)}
                                    >
                                      <child.icon />
                                      <span>{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                )}
                              </SidebarMenuSubItem>
                              
                              {/* Nested submenu (grandchildren) */}
                              {hasGrandChildren && isChildOpen && (
                                <div className="ml-4">
                                  {child.children?.map((grandchild) => (
                                    <SidebarMenuSubItem key={grandchild.href}>
                                      <SidebarMenuSubButton 
                                        asChild
                                        isActive={isActive(grandchild.href)}
                                        size="sm"
                                      >
                                        <Link 
                                          href={grandchild.href}
                                          onClick={(e) => handleLinkClick(grandchild.href, e)}
                                        >
                                          <grandchild.icon />
                                          <span>{grandchild.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </div>
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
                      {(session.user as any).roleDisplayName || getRoleDisplay((session.user as any).role || 'guest')}
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
                      Admin Settings
                    </Link>
                  </DropdownMenuItem>
                </CapabilityGuard>
                <CapabilityGuard capability="USER_VIEW">
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users">
                      <Users className="w-4 h-4" />
                      Manage Users
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