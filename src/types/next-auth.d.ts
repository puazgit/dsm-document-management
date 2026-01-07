import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      roleDisplayName?: string
      groupId: string
      divisiId: string
      isActive: boolean
      isExternal?: boolean
      mustChangePassword?: boolean
      // REMOVED: permissions - migrated to capabilities
      capabilities?: string[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    roleDisplayName?: string
    groupId: string
    divisiId: string
    isActive: boolean
    isExternal?: boolean
    mustChangePassword?: boolean
    // REMOVED: permissions - migrated to capabilities
    capabilities?: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    roleDisplayName?: string
    groupId: string
    divisiId: string
    isActive: boolean
    isExternal?: boolean
    mustChangePassword?: boolean
    // REMOVED: permissions - migrated to capabilities
    capabilities?: string[]
    capabilitiesLoadedAt?: number // Renamed from permissionsLoadedAt
  }
}