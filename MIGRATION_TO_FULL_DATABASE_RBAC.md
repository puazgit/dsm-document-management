# Migration Plan: Full Database-Driven RBAC

**Goal:** Menghilangkan hardcoded role checks dan menggunakan 100% database-driven capability system

**Timeline:** 2-4 minggu (tergantung ukuran codebase)

---

## 📊 Current State

```
┌─────────────────────────────────────────────┐
│          HYBRID SYSTEM (Current)            │
├─────────────────────────────────────────────┤
│                                             │
│  50% - Hardcoded (role-permissions.ts)      │
│  • Middleware route protection              │
│  • Some API routes                          │
│  • Legacy components                        │
│                                             │
│  50% - Database-driven (RBAC)               │
│  • RBAC Management UI                       │
│  • UnifiedAccessControl                     │
│  • Some modern API routes                   │
│                                             │
└─────────────────────────────────────────────┘
```

## 🎯 Target State

```
┌─────────────────────────────────────────────┐
│       FULL DATABASE-DRIVEN (Target)         │
├─────────────────────────────────────────────┤
│                                             │
│  100% - Database-driven RBAC                │
│  • All route protection from DB             │
│  • All API checks from DB                   │
│  • All components from DB                   │
│  • Dynamic, flexible, no code changes       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🗺️ PHASE 0: Preparation & Audit

### Step 0.1: Run Audit Script

```bash
# Jalankan audit yang sudah dibuat
npx ts-node scripts/audit-role-ambiguity.ts
```

**Output yang diharapkan:**
- Total roles & capabilities
- Users dengan/tanpa roles
- Mismatches antara group & roles

### Step 0.2: Find All Usage

```bash
# Cari semua file yang pakai role-permissions.ts
grep -r "from '@/config/role-permissions'" src/ --include="*.ts" --include="*.tsx"

# Cari hardcoded role arrays
grep -r "\['administrator'" src/ --include="*.ts" --include="*.tsx"
grep -r "\.includes(.*role" src/ --include="*.ts" --include="*.tsx"
```

**Buat list:**
```
src/middleware.ts                    - CRITICAL (blocks all routes)
src/lib/navigation.ts                - HIGH (sidebar visibility)
src/app/api/users/[id]/roles/route.ts - DONE ✅
src/app/api/users/[id]/group/route.ts - TODO
src/app/api/groups/[id]/route.ts     - TODO
... (dan seterusnya)
```

### Step 0.3: Verify Database Completeness

**Checklist:**
- [ ] Semua roles ada di database
- [ ] Semua capabilities defined
- [ ] Role-capability assignments lengkap
- [ ] Resources table populated (navigation, routes, apis)

```bash
# Check via Prisma Studio atau script
npx prisma studio

# Atau query manual
npx ts-node -e "
import { prisma } from '@/lib/prisma'
async function check() {
  const roles = await prisma.role.count()
  const caps = await prisma.roleCapability.count()
  const assignments = await prisma.roleCapabilityAssignment.count()
  const resources = await prisma.resource.count()
  console.log({ roles, caps, assignments, resources })
}
check()
"
```

---

## 🗺️ PHASE 1: API Routes Migration (Week 1)

### Priority: HIGH - Impact API security directly

### Step 1.1: Create Helper untuk API Routes

**File: `src/lib/rbac-helpers.ts`**

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { UnifiedAccessControl } from '@/lib/unified-access-control'
import { prisma } from '@/lib/prisma'

/**
 * Check if current session user has required capability
 * Use this in API routes instead of hardcoded role checks
 */
export async function requireCapability(
  request: NextRequest,
  capability: string
): Promise<{ authorized: boolean; userId?: string; error?: any }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
      }
    }

    const hasAccess = await UnifiedAccessControl.hasCapability(
      session.user.id,
      capability
    )

    if (!hasAccess) {
      return {
        authorized: false,
        error: NextResponse.json({ 
          error: 'Insufficient permissions',
          details: `Required capability: ${capability}`
        }, { status: 403 })
      }
    }

    return { authorized: true, userId: session.user.id }
  } catch (error) {
    console.error('requireCapability error:', error)
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Check if user has ANY of the required capabilities (OR logic)
 */
export async function requireAnyCapability(
  request: NextRequest,
  capabilities: string[]
): Promise<{ authorized: boolean; userId?: string; error?: any }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return { 
        authorized: false, 
        error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) 
      }
    }

    for (const cap of capabilities) {
      const hasAccess = await UnifiedAccessControl.hasCapability(
        session.user.id,
        cap
      )
      if (hasAccess) {
        return { authorized: true, userId: session.user.id }
      }
    }

    return {
      authorized: false,
      error: NextResponse.json({ 
        error: 'Insufficient permissions',
        details: `Required one of: ${capabilities.join(', ')}`
      }, { status: 403 })
    }
  } catch (error) {
    console.error('requireAnyCapability error:', error)
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

/**
 * Get current user with capabilities loaded
 */
export async function getCurrentUserWithCapabilities(request?: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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

  if (!user) return null

  // Flatten capabilities
  const capabilities = user.userRoles.flatMap(ur =>
    ur.role.capabilityAssignments.map(ca => ca.capability.id)
  )

  return {
    ...user,
    capabilities: Array.from(new Set(capabilities))
  }
}
```

### Step 1.2: Migrate API Routes One by One

**Template untuk setiap API route:**

**❌ SEBELUM:**
```typescript
// src/app/api/users/route.ts
import { ROLE_PERMISSIONS, hasAnyRoleWithPermission } from '@/config/role-permissions'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { userRoles: { include: { role: true } } }
  })
  
  const roleNames = user?.userRoles.map(ur => ur.role.name) || []
  const canManage = hasAnyRoleWithPermission(roleNames, 'CAN_MANAGE_USERS')
  
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // ... rest of code
}
```

**✅ SESUDAH:**
```typescript
// src/app/api/users/route.ts
import { requireCapability } from '@/lib/rbac-helpers'

export async function POST(request: NextRequest) {
  // Single line capability check
  const auth = await requireCapability(request, 'USER_MANAGE')
  if (!auth.authorized) return auth.error
  
  // ... rest of code (userId tersedia di auth.userId)
}
```

**Checklist API Routes:**
- [ ] `/api/users/**` - USER_MANAGE, USER_VIEW
- [ ] `/api/roles/**` - ROLE_MANAGE
- [ ] `/api/groups/**` - Organization management
- [ ] `/api/documents/**` - DOCUMENT_* capabilities
- [ ] `/api/admin/**` - Various admin capabilities
- [ ] `/api/analytics/**` - ANALYTICS_VIEW
- [ ] `/api/audit-logs/**` - AUDIT_VIEW

### Step 1.3: Test Each Migrated Route

```bash
# Test script per route
curl -X GET http://localhost:3000/api/users \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json"

# Expected: Should check capability from DB
```

---

## 🗺️ PHASE 2: Middleware Migration (Week 2)

### Priority: CRITICAL - Affects all route protection

### Step 2.1: Create Database-Driven Middleware

**File: `src/middleware-v2.ts`** (new file, parallel deployment)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * Database-driven middleware
 * No hardcoded routes or roles
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files, API routes, public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Public routes
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/unauthorized',
  ]
  
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Get user session
  const token = await getToken({ req: request })
  
  if (!token?.sub) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if route is protected in database
  const resource = await prisma.resource.findFirst({
    where: {
      type: 'route',
      path: pathname,
      isActive: true
    },
    include: {
      requiredCapability: true
    }
  })

  // If no resource defined, allow (or deny based on policy)
  if (!resource) {
    return NextResponse.next()
  }

  // If resource requires capability, check user has it
  if (resource.requiredCapability) {
    const userId = token.sub

    // Check user capabilities
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        isActive: true
      },
      include: {
        role: {
          include: {
            capabilityAssignments: {
              where: {
                capabilityId: resource.requiredCapability
              }
            }
          }
        }
      }
    })

    const hasCapability = userRoles.some(
      ur => ur.role.capabilityAssignments.length > 0
    )

    if (!hasCapability) {
      const unauthorizedUrl = new URL('/unauthorized', request.url)
      return NextResponse.redirect(unauthorizedUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|api|static|favicon.ico).*)',
  ],
}
```

### Step 2.2: Parallel Testing

**Opsi A: Gradual Cutover**
```typescript
// src/middleware.ts (keep old)
// src/middleware-v2.ts (new DB-driven)

// Test via feature flag
const USE_NEW_MIDDLEWARE = process.env.USE_DB_MIDDLEWARE === 'true'

if (USE_NEW_MIDDLEWARE) {
  // Use v2
} else {
  // Use old
}
```

**Opsi B: Route-based Cutover**
```typescript
// Certain routes use new, others use old
const NEW_MIDDLEWARE_ROUTES = ['/admin/users', '/admin/roles']

if (NEW_MIDDLEWARE_ROUTES.some(r => pathname.startsWith(r))) {
  return middlewareV2(request)
} else {
  return middlewareV1(request)
}
```

### Step 2.3: Performance Optimization

**Problem:** Middleware DB query bisa lambat

**Solution: Caching**

```typescript
// src/lib/route-cache.ts
import { LRUCache } from 'lru-cache'

interface ResourceCache {
  path: string
  requiredCapability: string | null
}

const routeCache = new LRUCache<string, ResourceCache>({
  max: 500,
  ttl: 1000 * 60 * 5 // 5 minutes
})

export async function getResourceWithCache(path: string) {
  const cached = routeCache.get(path)
  if (cached) return cached

  const resource = await prisma.resource.findFirst({
    where: { type: 'route', path, isActive: true }
  })

  const data = {
    path,
    requiredCapability: resource?.requiredCapability || null
  }

  routeCache.set(path, data)
  return data
}
```

---

## 🗺️ PHASE 3: Component & Navigation Migration (Week 2-3)

### Step 3.1: Update Navigation Helper

**File: `src/lib/navigation.ts`**

**❌ SEBELUM:**
```typescript
export const navigationItems: NavItem[] = [
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    requiredRoles: ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'], // ❌ Hardcoded
    children: [...]
  }
]
```

**✅ SESUDAH:**
```typescript
// Remove requiredRoles, use requiredCapability instead
export const navigationItems: NavItem[] = [
  {
    title: 'Admin',
    href: '/admin',
    icon: Shield,
    requiredCapability: 'ADMIN_ACCESS', // ✅ From DB
    children: [...]
  }
]

// Helper to filter navigation by user capabilities
export async function getNavigationForUser(userId: string) {
  const user = await getCurrentUserWithCapabilities()
  if (!user) return []

  return navigationItems.filter(item => {
    if (!item.requiredCapability) return true
    return user.capabilities.includes(item.requiredCapability)
  }).map(item => ({
    ...item,
    children: item.children?.filter(child => {
      if (!child.requiredCapability) return true
      return user.capabilities.includes(child.requiredCapability)
    })
  }))
}
```

### Step 3.2: Update Components

**Create reusable component:**

**File: `src/components/auth/capability-guard.tsx`**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { ReactNode, useEffect, useState } from 'react'

interface CapabilityGuardProps {
  children: ReactNode
  capability: string
  fallback?: ReactNode
}

export function CapabilityGuard({ 
  children, 
  capability, 
  fallback = null 
}: CapabilityGuardProps) {
  const { data: session } = useSession()
  const [hasCapability, setHasCapability] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkCapability() {
      if (!session?.user?.id) {
        setHasCapability(false)
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/auth/check-capability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ capability })
        })
        
        const data = await res.json()
        setHasCapability(data.hasCapability)
      } catch (error) {
        setHasCapability(false)
      } finally {
        setLoading(false)
      }
    }

    checkCapability()
  }, [session, capability])

  if (loading) return null
  if (!hasCapability) return fallback as JSX.Element

  return <>{children}</>
}
```

**Usage:**
```typescript
// ❌ SEBELUM
<RoleGuard requiredRoles={['admin', 'ppd.pusat']}>
  <AdminButton />
</RoleGuard>

// ✅ SESUDAH
<CapabilityGuard capability="ADMIN_ACCESS">
  <AdminButton />
</CapabilityGuard>
```

---

## 🗺️ PHASE 4: Testing & Validation (Week 3)

### Step 4.1: Automated Tests

**File: `tests/rbac-migration.test.ts`**

```typescript
import { describe, it, expect } from '@jest/globals'
import { UnifiedAccessControl } from '@/lib/unified-access-control'
import { prisma } from '@/lib/prisma'

describe('RBAC Migration Tests', () => {
  it('should check capability from database', async () => {
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@dsm.com' }
    })
    
    expect(adminUser).toBeDefined()
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      adminUser!.id,
      'USER_MANAGE'
    )
    
    expect(hasAccess).toBe(true)
  })

  it('should deny access without capability', async () => {
    const viewerUser = await prisma.user.findFirst({
      where: { email: 'viewer@dsm.com' }
    })
    
    const hasAccess = await UnifiedAccessControl.hasCapability(
      viewerUser!.id,
      'USER_MANAGE'
    )
    
    expect(hasAccess).toBe(false)
  })

  // Test all critical capabilities
  const testCases = [
    { email: 'admin@dsm.com', capability: 'SYSTEM_CONFIG', expected: true },
    { email: 'ppd.pusat@dsm.com', capability: 'ROLE_MANAGE', expected: true },
    { email: 'ppd.unit@dsm.com', capability: 'ROLE_MANAGE', expected: false },
    { email: 'manager@dsm.com', capability: 'DOCUMENT_APPROVE', expected: true },
    { email: 'viewer@dsm.com', capability: 'DOCUMENT_EDIT', expected: false },
  ]

  testCases.forEach(({ email, capability, expected }) => {
    it(`${email} should ${expected ? '' : 'not '}have ${capability}`, async () => {
      const user = await prisma.user.findFirst({ where: { email } })
      const hasAccess = await UnifiedAccessControl.hasCapability(
        user!.id,
        capability
      )
      expect(hasAccess).toBe(expected)
    })
  })
})
```

### Step 4.2: Manual Testing Checklist

- [ ] Login sebagai admin - akses semua menu
- [ ] Login sebagai ppd.pusat - akses admin menu
- [ ] Login sebagai ppd.unit - akses terbatas
- [ ] Login sebagai manager - akses document management
- [ ] Login sebagai viewer - read-only access
- [ ] Test via RBAC UI: assign/revoke capability, refresh, re-test access
- [ ] Test middleware: access protected routes
- [ ] Test API: call endpoints without auth (should 401)
- [ ] Test API: call endpoints without capability (should 403)

### Step 4.3: Performance Testing

```bash
# Load test middleware
ab -n 1000 -c 10 http://localhost:3000/admin/users

# Monitor DB query time
# Adjust caching if needed
```

---

## 🗺️ PHASE 5: Cleanup & Deprecation (Week 4)

### Step 5.1: Remove Old Code

```bash
# Backup first
git checkout -b backup-before-cleanup

# Remove or comment out
# src/config/role-permissions.ts (or keep only types)
# Old middleware checks
# Old API route checks
```

### Step 5.2: Update role-permissions.ts

**Keep only for type safety:**

```typescript
// src/config/role-permissions.ts
/**
 * ✅ This file now only contains TYPE DEFINITIONS
 * ❌ DO NOT use ROLE_PERMISSIONS mappings (deprecated)
 * ✅ USE: UnifiedAccessControl.hasCapability() from database
 */

export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  ADMINISTRATOR: 'administrator',
  PPD_PUSAT: 'ppd.pusat',
  PPD_UNIT: 'ppd.unit',
  // ... 
} as const

export type SystemRoleName = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES]

// ❌ DEPRECATED - Do not use
// export const ROLE_PERMISSIONS = { ... }

// ❌ DEPRECATED - Do not use
// export function hasRolePermission() { ... }
```

### Step 5.3: Documentation Update

**Update README.md:**
```markdown
## Access Control

This system uses **100% database-driven RBAC**.

### For Developers

**✅ DO:**
```typescript
import { requireCapability } from '@/lib/rbac-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireCapability(request, 'USER_MANAGE')
  if (!auth.authorized) return auth.error
  // ...
}
```

**❌ DON'T:**
```typescript
// Don't hardcode role names
if (['admin', 'ppd.pusat'].includes(role)) { ... }

// Don't use deprecated ROLE_PERMISSIONS
import { ROLE_PERMISSIONS } from '@/config/role-permissions'
```

### For Admins

All permissions managed via RBAC UI:
- `/admin/rbac/assignments` - Assign capabilities to roles
- `/admin/rbac/resources` - Manage protected resources
- Changes take effect immediately (no code deploy needed)
```

---

## 📋 Migration Checklist Summary

### Pre-Migration
- [ ] Run audit script
- [ ] Document all hardcoded checks
- [ ] Verify database completeness
- [ ] Create backup branch

### Phase 1: API Routes
- [ ] Create rbac-helpers.ts
- [ ] Migrate /api/users/**
- [ ] Migrate /api/roles/**
- [ ] Migrate /api/documents/**
- [ ] Migrate /api/admin/**
- [ ] Test each endpoint

### Phase 2: Middleware
- [ ] Create middleware-v2.ts
- [ ] Add caching layer
- [ ] Parallel testing
- [ ] Performance validation
- [ ] Full cutover

### Phase 3: Components
- [ ] Update navigation helper
- [ ] Create CapabilityGuard component
- [ ] Migrate all RoleGuard usage
- [ ] Update sidebar

### Phase 4: Testing
- [ ] Write automated tests
- [ ] Manual testing all roles
- [ ] Performance testing
- [ ] Security audit

### Phase 5: Cleanup
- [ ] Remove deprecated code
- [ ] Update documentation
- [ ] Delete or archive role-permissions.ts
- [ ] Training for team

---

## 🚀 Quick Start Commands

```bash
# 1. Run audit
npx ts-node scripts/audit-role-ambiguity.ts

# 2. Find all usage
grep -r "ROLE_PERMISSIONS" src/ > migration-todos.txt

# 3. Create helper file
touch src/lib/rbac-helpers.ts

# 4. Start migrating (priority: API routes)
# Edit each file manually or use script

# 5. Test
npm run test
npm run dev  # Manual testing

# 6. Deploy
git commit -m "feat: migrate to full database-driven RBAC"
git push
```

---

## 📊 Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Hardcoded role checks | 50+ | 0 |
| Database-driven checks | 30% | 100% |
| RBAC UI effectiveness | Partial | Full control |
| Code maintainability | Medium | High |
| Permission change time | 1 day (deploy) | Instant (UI) |

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance degradation | HIGH | Implement caching, optimize queries |
| Breaking changes | HIGH | Parallel deployment, gradual rollout |
| Missing capabilities | MEDIUM | Comprehensive audit, testing |
| User confusion | LOW | Clear documentation, training |

---

## 🎯 Final State

```typescript
// ✅ All access control from database
await UnifiedAccessControl.hasCapability(userId, 'USER_MANAGE')

// ✅ Admin changes via UI
// Admin → RBAC Management → Assign capability → Immediate effect

// ✅ No code changes needed for permission updates
// ✅ Fully auditable
// ✅ Flexible & scalable
```

**Duration:** 2-4 weeks
**Priority:** HIGH (Security & Maintainability)
**Dependencies:** Database, UnifiedAccessControl, RBAC UI
**Team Size:** 1-2 developers

---

**Next Step:** Start with Phase 0 audit and create rbac-helpers.ts! 🚀
