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
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
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
              credentials.email,
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
              credentials.email,
              'Invalid password'
            )
            return null
          }

          if (!user.isActive) {
            // Log failed login attempt for inactive user
            await auditHelpers.loginFailed(
              user.id,
              credentials.email,
              'Account inactive'
            )
            return null
          }

          // Log successful login
          await auditHelpers.loginSuccess(
            user.id,
            credentials.email
          )

          // Get primary role from userRoles
          const primaryRole = user.userRoles?.[0]?.role?.name || user.group?.name || 'user';
          
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            role: primaryRole,
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
      // Load permissions on initial login (when user object exists)
      if (user) {
        token.sub = user.id
        token.role = (user as any).role
        token.groupId = (user as any).groupId
        token.divisiId = (user as any).divisiId
        token.isActive = (user as any).isActive
        // Don't set permissionsLoadedAt yet - let it load below
      }
      
      // Refresh permissions periodically (every 1 minute) or on manual update trigger
      // This allows role changes to take effect without logout
      const shouldRefreshPermissions = 
        trigger === 'update' || // Manual refresh
        !token.permissionsLoadedAt || // First time (including initial login)
        user || // When user object exists (fresh login)
        (Date.now() - (token.permissionsLoadedAt as number)) > 60000 // More than 1 minute old
      
      if (shouldRefreshPermissions && token.sub) {
        try {
          const userWithPermissions = await prisma.user.findUnique({
            where: { id: token.sub },
            include: {
              userRoles: {
                where: { isActive: true },
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true
                        }
                      },
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
          
          if (userWithPermissions) {
            // Update role in case it changed
            const primaryRole = userWithPermissions.userRoles?.[0]?.role?.name || token.role
            token.role = primaryRole
            
            // Load permissions
            const permissions = userWithPermissions.userRoles.flatMap(userRole => 
              userRole.role.rolePermissions.map(rp => rp.permission.name)
            )
            token.permissions = [...new Set(permissions)]
            
            // Load capabilities
            const capabilities = userWithPermissions.userRoles.flatMap(userRole =>
              userRole.role.capabilityAssignments.map(ca => ca.capability.name)
            )
            token.capabilities = [...new Set(capabilities)]
            
            // Update timestamp
            token.permissionsLoadedAt = Date.now()
          }
        } catch (error) {
          console.error('Error refreshing permissions:', error)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.groupId = token.groupId
        session.user.divisiId = token.divisiId
        session.user.isActive = token.isActive
        session.user.permissions = token.permissions as string[]
        session.user.capabilities = token.capabilities as string[]
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
}