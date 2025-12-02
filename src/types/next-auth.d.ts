import NextAuth from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      groupId: string
      divisiId: string
      isActive: boolean
      permissions?: string[]
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: string
    groupId: string
    divisiId: string
    isActive: boolean
    permissions?: string[]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    groupId: string
    divisiId: string
    isActive: boolean
    permissions?: string[]
  }
}