import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import { verifyPassword } from "./auth"
import { auditHelpers } from "./audit"
import { getUserWithPermissions } from "./permissions"
import { isAdmin as checkIsAdmin, type CapabilityUser } from "./capabilities"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        emailOrUsername: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.emailOrUsername || !credentials?.password) {
          return null
        }

        try {
          // Determine if input is email or username
          const isEmail = credentials.emailOrUsername.includes('@');
          
          // Find user by email or username
          const user = await prisma.user.findUnique({
            where: isEmail 
              ? { email: credentials.emailOrUsername }
              : { username: credentials.emailOrUsername },
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true,
              passwordHash: true,
              groupId: true,
              divisiId: true,
              isActive: true,
              group: true,
              divisi: true,
              userRoles: {
                where: { isActive: true },
                select: {
                  role: {
                    select: {
                      id: true,
                      name: true,
                      displayName: true
                    }
                  }
                }
              }
            }
          })

          if (!user) {
            // Log failed login attempt for non-existent user
            await auditHelpers.loginFailed(
              null,
              credentials.emailOrUsername,
              'User not found'
            )
            return null
          }

          const isPasswordValid = await verifyPassword(
            credentials.password, 
            user.passwordHash
          )

          if (!isPasswordValid) {
            // Log failed login attempt
            await auditHelpers.loginFailed(
              user.id,
              credentials.emailOrUsername,
              'Invalid password'
            )
            return null
          }

          if (!user.isActive) {
            // Log failed login attempt for inactive user
            await auditHelpers.loginFailed(
              user.id,
              credentials.emailOrUsername,
              'Account inactive'
            )
            return null
          }

          // Log successful login
          await auditHelpers.loginSuccess(
            user.id,
            user.email
          )

          // Get primary role from userRoles
          const primaryRole = user.userRoles?.[0]?.role?.name || user.group?.name || 'user';
          const primaryRoleDisplayName = user.userRoles?.[0]?.role?.displayName || user.group?.displayName || 'User';
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            role: primaryRole,
            roleDisplayName: primaryRoleDisplayName,
            groupId: user.groupId || "",
            divisiId: user.divisiId || "",
            isActive: user.isActive,
          } as any
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Load capabilities on initial login (when user object exists)
      if (user) {
        token.sub = user.id
        token.role = (user as any).role
        token.roleDisplayName = (user as any).roleDisplayName
        token.groupId = (user as any).groupId
        token.divisiId = (user as any).divisiId
        token.isActive = (user as any).isActive
        // Don't set capabilitiesLoadedAt yet - let it load below
      }
      
      // Refresh capabilities periodically (every 1 minute) or on manual update trigger
      // This allows role changes to take effect without logout
      const shouldRefreshCapabilities = 
        trigger === 'update' || // Manual refresh
        !token.capabilitiesLoadedAt || // First time (including initial login)
        user || // When user object exists (fresh login)
        (Date.now() - (token.capabilitiesLoadedAt as number)) > 60000 // More than 1 minute old
      
      if (shouldRefreshCapabilities && token.sub) {
        try {
          const userWithCapabilities = await prisma.user.findUnique({
            where: { id: token.sub },
            include: {
              userRoles: {
                where: { isActive: true },
                include: {
                  role: {
                    include: {
                      capabilityAssignments: {
                        include: {
                          capability: true
                        }
                      }
                    }
                  }
                }
              }
            }
          })
          
          if (userWithCapabilities) {
            // Update role in case it changed
            const primaryRole = userWithCapabilities.userRoles?.[0]?.role?.name || token.role
            const primaryRoleDisplayName = userWithCapabilities.userRoles?.[0]?.role?.displayName || token.roleDisplayName
            token.role = primaryRole
            token.roleDisplayName = primaryRoleDisplayName
            
            // Load capabilities (removed permissions)
            const capabilities = userWithCapabilities.userRoles.flatMap(userRole =>
              userRole.role.capabilityAssignments.map(ca => ca.capability.name)
            )
            token.capabilities = [...new Set(capabilities)]
            
            // Update timestamp
            token.capabilitiesLoadedAt = Date.now()
          }
        } catch (error) {
          console.error('Error refreshing capabilities:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.roleDisplayName = token.roleDisplayName
        session.user.groupId = token.groupId
        session.user.divisiId = token.divisiId
        session.user.isActive = token.isActive
        // REMOVED: session.user.permissions (migrated to capabilities)
        session.user.capabilities = token.capabilities as string[]
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If the url is a relative path, prepend baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // If the url is on the same origin as base url, allow it
      else if (new URL(url).origin === baseUrl) return url
      // Otherwise, return baseUrl
      return baseUrl
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
}