import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import { verifyPassword } from "./auth"
import { auditHelpers } from "./audit"
import { getUserWithPermissions } from "./permissions"

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
    async jwt({ token, user }) {
      if (user) {
        console.log('🔐 JWT Callback - User Login:', user.email);
        token.sub = user.id // Set user ID as sub
        token.role = (user as any).role
        token.groupId = (user as any).groupId
        token.divisiId = (user as any).divisiId
        token.isActive = (user as any).isActive
        
        // Load user permissions from database
        try {
          console.log('📊 JWT Callback - Loading permissions for:', user.email);
          
          // Special handling for administrator role - grant all permissions
          if ((user as any).role === 'administrator') {
            console.log('🔥 JWT Callback - Administrator detected, granting all permissions');
            token.permissions = [
              'users.create', 'users.read', 'users.update', 'users.delete',
              'documents.create', 'documents.read', 'documents.update', 'documents.delete', 'documents.approve',
              'roles.create', 'roles.read', 'roles.update', 'roles.delete',
              'permissions.create', 'permissions.read', 'permissions.update', 'permissions.delete',
              'analytics.read', 'analytics.create', 'analytics.update', 'analytics.delete',
              'system.admin'
            ]
          } else {
            const userWithPermissions = await prisma.user.findUnique({
              where: { email: user.email },
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
                        }
                      }
                    }
                  }
                }
              }
            })
            
            if (userWithPermissions) {
              const permissions = userWithPermissions.userRoles.flatMap(userRole => 
                userRole.role.rolePermissions.map(rp => rp.permission.name)
              )
              token.permissions = [...new Set(permissions)]
              console.log('✅ JWT Callback - Permissions loaded:', permissions.length, 'permissions');
              console.log('🔑 JWT Callback - PDF Permissions:', permissions.filter(p => p.includes('pdf') || p.includes('download')));
            } else {
              console.log('❌ JWT Callback - No user found with permissions');
            }
          }
        } catch (error) {
          console.error('❌ JWT Callback - Error loading permissions:', error)
        }
        console.log('🎯 JWT Callback - Final token role:', token.role);
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        console.log('📋 Session Callback - Creating session for:', session.user.email);
        session.user.id = token.sub!
        session.user.role = token.role
        session.user.groupId = token.groupId
        session.user.divisiId = token.divisiId
        session.user.isActive = token.isActive
        session.user.permissions = token.permissions as string[]
        console.log('✅ Session Callback - Final session role:', session.user.role);
        console.log('🔑 Session Callback - Permissions count:', session.user.permissions?.length || 0);
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