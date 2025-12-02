"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { Button } from "./button"
import { ThemeToggle } from "../theme-toggle"
import { SidebarTrigger } from "./sidebar"

const getPageInfo = (pathname: string) => {
  switch (pathname) {
    case '/dashboard':
      return {
        title: 'Dashboard',
        description: 'Overview of your document management system'
      }
    case '/documents':
      return {
        title: 'Documents',
        description: 'Manage and organize your documents'
      }
    case '/documents/upload':
      return {
        title: 'Upload Document',
        description: 'Add new documents to the system'
      }
    case '/profile':
      return {
        title: 'Profile',
        description: 'Manage your account settings and preferences'
      }
    case '/admin':
      return {
        title: 'Admin Dashboard',
        description: 'Administrative functions and system management'
      }
    case '/admin/users':
      return {
        title: 'User Management',
        description: 'Manage users, roles, and permissions'
      }
    case '/admin/roles':
      return {
        title: 'Role Management',
        description: 'Configure roles and permissions'
      }
    case '/admin/settings':
      return {
        title: 'System Settings',
        description: 'System configuration and preferences'
      }
    case '/admin/audit':
      return {
        title: 'Audit Logs',
        description: 'View system activity and user actions'
      }
    case '/analytics':
      return {
        title: 'Analytics',
        description: 'Reports and data insights'
      }
    default:
      return {
        title: 'Dashboard',
        description: 'Document Management System'
      }
  }
}

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const pageInfo = getPageInfo(pathname)

  if (!session) return null

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4 bg-background border-b border-border">
      <SidebarTrigger className="-ml-1" />
      
      {/* Page Title - Dynamic based on current page */}
      <div className="flex-1">
        <h2 className="text-xl font-semibold text-foreground">{pageInfo.title}</h2>
        <p className="text-sm text-muted-foreground">{pageInfo.description}</p>
      </div>

      {/* Right side - Theme toggle and Notifications */}
      <div className="flex items-center space-x-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
      </div>
    </header>
  )
}