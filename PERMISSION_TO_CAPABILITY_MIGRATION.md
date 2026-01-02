# Migration: Permission-Based → Capability-Based Authorization

**Status:** Planning  
**Created:** January 2, 2026  
**Estimated Duration:** 2-3 days  
**Priority:** High

---

## 📋 Executive Summary

Migrate from dual authorization system (Permission + Capability) to single unified Capability-based system. This eliminates redundancy, improves maintainability, and removes 40+ hardcoded permission checks.

### Current State (Dual System)
```typescript
// Legacy Permission-based
session.user.permissions.includes('documents.read')

// Modern Capability-based
hasCapability(session.user, 'DOCUMENT_READ')
```

### Target State (Unified)
```typescript
// Single source of truth
hasCapability(session.user, 'DOCUMENT_READ')
```

---

## 🎯 Migration Goals

1. ✅ Remove `Permission` and `RolePermission` tables
2. ✅ Remove `session.user.permissions` array
3. ✅ Migrate all permission checks to capabilities
4. ✅ Update NextAuth JWT callbacks
5. ✅ Deprecate `/api/permissions` endpoints
6. ✅ Clean up legacy code

---

## 📊 Current System Analysis

### Database Tables
- ✅ `RoleCapability` - Modern capability definitions
- ✅ `RoleCapabilityAssignment` - Role-to-capability mapping
- ⚠️ `Permission` - **LEGACY - To be removed**
- ⚠️ `RolePermission` - **LEGACY - To be removed**

### Active Dependencies (To be migrated)

#### 1. NextAuth Session (`/src/lib/next-auth.ts`)
```typescript
// Lines 151-160: Loads rolePermissions
rolePermissions: {
  include: {
    permission: true
  }
}

// Lines 205: Populates session
session.user.permissions = token.permissions as string[]
```

#### 2. API Routes Using Permissions (8 files)
- `/api/permissions/route.ts` - List/Create permissions
- `/api/permissions/[id]/route.ts` - GET/PUT/DELETE permission
- `/api/roles/[id]/permissions/route.ts` - Role permission management
- `/api/groups/[id]/permissions/route.ts` - Group permissions (legacy)
- `/api/documents/[id]/status/route.ts` - Uses `session.user.permissions`
- `/api/documents/[id]/archive/route.ts` - Uses `session.user.permissions`
- `/api/documents/[id]/version/[version]/route.ts` - Uses `session.user.permissions`
- `/api/debug-permissions/route.ts` - Debug endpoint

#### 3. Hooks Using Permissions
- `/src/hooks/use-role-visibility.tsx` - Maps permission strings to visibility flags

#### 4. Components Using Permissions
- `/src/components/ui/role-based-header.tsx` - Displays permission count

---

## 🗺️ Migration Roadmap

### Phase 1: Preparation & Mapping (4 hours)

#### Task 1.1: Create Permission → Capability Mapping
**File:** Create `/docs/PERMISSION_CAPABILITY_MAPPING.md`

Document all existing permissions and their capability equivalents:

```markdown
| Legacy Permission     | New Capability        | Notes           |
|-----------------------|----------------------|-----------------|
| documents.read        | DOCUMENT_READ        | Read documents  |
| documents.create      | DOCUMENT_CREATE      | Create docs     |
| documents.update      | DOCUMENT_UPDATE      | Update docs     |
| documents.update.own  | DOCUMENT_UPDATE_OWN  | Update own only |
| documents.delete      | DOCUMENT_DELETE      | Delete docs     |
| documents.approve     | DOCUMENT_APPROVE     | Approve docs    |
| pdf.view              | PDF_VIEW             | View PDFs       |
| pdf.download          | PDF_DOWNLOAD         | Download PDFs   |
| pdf.print             | PDF_PRINT            | Print PDFs      |
| pdf.copy              | PDF_COPY             | Copy PDF text   |
| pdf.watermark         | PDF_WATERMARK        | Manage watermark|
| users.read            | USER_READ            | View users      |
| users.create          | USER_CREATE          | Create users    |
| users.update          | USER_UPDATE          | Update users    |
| users.delete          | USER_DELETE          | Delete users    |
| roles.read            | ROLE_READ            | View roles      |
| roles.create          | ROLE_CREATE          | Create roles    |
| roles.update          | ROLE_UPDATE          | Update roles    |
| roles.delete          | ROLE_DELETE          | Delete roles    |
```

#### Task 1.2: Audit All Permission Usage
**Script:** Create `/scripts/audit-permission-usage.ts`

```typescript
// Find all locations using session.user.permissions
// Find all permission strings in codebase
// Generate migration checklist
```

#### Task 1.3: Create Missing Capabilities
**Script:** Create `/scripts/create-missing-capabilities.ts`

Ensure all permissions have capability equivalents in database.

---

### Phase 2: Database & Types (3 hours)

#### Task 2.1: Update Prisma Schema
**File:** `/prisma/schema.prisma`

```prisma
model User {
  // ... existing fields
  // Remove permission relations if any
  
  @@map("users")
}

model Role {
  // ... existing fields
  // Remove: rolePermissions RolePermission[]
  // Keep: capabilityAssignments RoleCapabilityAssignment[]
  
  @@map("roles")
}

// Comment out or remove Permission model
// model Permission { ... }

// Comment out or remove RolePermission model
// model RolePermission { ... }
```

#### Task 2.2: Update Session Types
**File:** `/src/types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface User {
    id: string
    role: string
    groupId?: string
    divisiId?: string
    isActive: boolean
    // Remove: permissions?: string[]
    capabilities?: string[] // Keep only this
  }

  interface Session {
    user: User & {
      id: string
      role: string
      // Remove: permissions: string[]
      capabilities: string[] // Keep only this
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
    role?: string
    groupId?: string
    divisiId?: string
    isActive?: boolean
    // Remove: permissions?: string[]
    capabilities?: string[]
    capabilitiesLoadedAt?: number
  }
}
```

#### Task 2.3: Create Migration Script
**Script:** `/scripts/migrate-permissions-to-capabilities.ts`

```typescript
// 1. Read all RolePermission entries
// 2. Map to RoleCapabilityAssignment using mapping table
// 3. Create missing RoleCapabilityAssignment records
// 4. Verify all roles have equivalent capabilities
// 5. Generate report
```

---

### Phase 3: Update NextAuth (2 hours)

#### Task 3.1: Update JWT Callback
**File:** `/src/lib/next-auth.ts`

**Before:**
```typescript
include: {
  userRoles: {
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

// Extract permissions
const permissions = userWithPermissions?.userRoles
  .flatMap(ur => ur.role.rolePermissions
    .filter(rp => rp.isGranted)
    .map(rp => rp.permission.name)
  ) || []
token.permissions = permissions
```

**After:**
```typescript
include: {
  userRoles: {
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

// Extract only capabilities
const capabilities = userWithPermissions?.userRoles
  .flatMap(ur => ur.role.capabilityAssignments
    .map(ca => ca.capability.name)
  ) || []
token.capabilities = capabilities
```

#### Task 3.2: Update Session Callback
**File:** `/src/lib/next-auth.ts`

**Before:**
```typescript
session.user.permissions = token.permissions as string[]
session.user.capabilities = token.capabilities as string[]
```

**After:**
```typescript
// Remove permissions line
session.user.capabilities = token.capabilities as string[]
```

#### Task 3.3: Update Refresh Logic
Change `permissionsLoadedAt` to `capabilitiesLoadedAt` throughout.

---

### Phase 4: Update API Routes (4 hours)

#### Task 4.1: Update Document Status Routes
**File:** `/src/app/api/documents/[id]/status/route.ts`

**Before:**
```typescript
const userPermissions = session.user.permissions || [];
const canUpdate = userPermissions.includes('documents.update') ||
  (userPermissions.includes('documents.update.own') && document.createdById === session.user.id);
```

**After:**
```typescript
const canUpdate = hasCapability(session.user, 'DOCUMENT_UPDATE') ||
  (hasCapability(session.user, 'DOCUMENT_UPDATE_OWN') && document.createdById === session.user.id);
```

Repeat for:
- `/api/documents/[id]/archive/route.ts` (2 locations)
- `/api/documents/[id]/version/[version]/route.ts` (2 locations)

#### Task 4.2: Deprecate Permission API Endpoints
**Files to modify:**
- `/api/permissions/route.ts` - Add deprecation warning
- `/api/permissions/[id]/route.ts` - Add deprecation warning
- `/api/roles/[id]/permissions/route.ts` - Update to use capabilities
- `/api/groups/[id]/permissions/route.ts` - Mark as legacy

Add to all permission endpoints:
```typescript
console.warn('[DEPRECATED] /api/permissions endpoint - Use /api/admin/role-capabilities instead')
return NextResponse.json({
  error: 'This endpoint is deprecated. Use capability-based endpoints.',
  migration_guide: '/docs/PERMISSION_TO_CAPABILITY_MIGRATION.md'
}, { status: 410 }) // 410 Gone
```

---

### Phase 5: Update Hooks & Components (2 hours)

#### Task 5.1: Update useRoleVisibility Hook
**File:** `/src/hooks/use-role-visibility.tsx`

**Before:**
```typescript
const hasPermission = useCallback((permission: string) => {
  return session?.user?.permissions?.includes(permission) || false
}, [session?.user?.permissions])
```

**After:**
```typescript
const hasPermission = useCallback((permission: string) => {
  // Map legacy permission strings to capabilities for backward compatibility
  const capabilityMap: Record<string, string> = {
    'documents.read': 'DOCUMENT_READ',
    'documents.create': 'DOCUMENT_CREATE',
    'documents.update': 'DOCUMENT_UPDATE',
    'documents.update.own': 'DOCUMENT_UPDATE_OWN',
    'pdf.view': 'PDF_VIEW',
    'pdf.download': 'PDF_DOWNLOAD',
    'pdf.print': 'PDF_PRINT',
    // ... full mapping
  }
  
  const capability = capabilityMap[permission] || permission
  return session?.user?.capabilities?.includes(capability) || false
}, [session?.user?.capabilities])
```

**Better approach:** Remove `hasPermission` entirely and use `useCapabilities` hook directly.

#### Task 5.2: Update role-based-header Component
**File:** `/src/components/ui/role-based-header.tsx`

**Before:**
```typescript
{session.user.permissions?.length || 0} permissions
```

**After:**
```typescript
{session.user.capabilities?.length || 0} capabilities
```

#### Task 5.3: Remove debug-permissions Endpoint
**File:** `/src/app/api/debug-permissions/route.ts`

Either update to show capabilities or mark as deprecated.

---

### Phase 6: Testing & Verification (4 hours)

#### Task 6.1: Create Test Suite
**Script:** `/scripts/test-capability-migration.ts`

```typescript
// Test scenarios:
// 1. User login - capabilities loaded correctly
// 2. Document CRUD - capability checks work
// 3. PDF operations - PDF capabilities enforced
// 4. Role changes - capabilities refresh on session update
// 5. Navigation visibility - menus show/hide correctly
// 6. API authorization - all endpoints use capabilities
```

#### Task 6.2: Manual Testing Checklist

```markdown
## Pre-Migration Checks
- [ ] Backup database
- [ ] Document current role assignments
- [ ] Export RolePermission table to CSV

## Post-Migration Checks
- [ ] All users can log in
- [ ] Admin can access all features
- [ ] Manager can access manager features
- [ ] Editor has correct document access
- [ ] Viewer has read-only access
- [ ] PDF capabilities work (view/download/print)
- [ ] Document workflow (draft→review→approved) works
- [ ] Navigation menus show correctly per role
- [ ] RBAC UI (/admin/rbac/assignments) works
- [ ] No console errors about missing permissions

## Regression Tests
- [ ] Test with each role: admin, manager, editor, viewer, guest
- [ ] Test document creation
- [ ] Test document status changes
- [ ] Test PDF viewer
- [ ] Test user management
- [ ] Test role assignment UI
```

#### Task 6.3: Run Capability Audit
**Script:** Create `/scripts/audit-post-migration.ts`

```typescript
// Verify:
// 1. All roles have capabilities assigned
// 2. No references to session.user.permissions in code
// 3. No active RolePermission records
// 4. All API routes use hasCapability()
// 5. All hooks use capabilities
```

---

### Phase 7: Database Cleanup (1 hour)

#### Task 7.1: Create Backup Migration
**File:** `/prisma/migrations/YYYYMMDD_backup_permissions.sql`

```sql
-- Backup Permission and RolePermission data before removal
CREATE TABLE IF NOT EXISTS _backup_permissions AS 
SELECT * FROM permissions;

CREATE TABLE IF NOT EXISTS _backup_role_permissions AS 
SELECT * FROM role_permissions;
```

#### Task 7.2: Drop Permission Tables
**File:** `/prisma/schema.prisma`

Completely remove:
```prisma
// Remove these models:
model Permission { ... }
model RolePermission { ... }
```

#### Task 7.3: Generate Migration
```bash
npx prisma migrate dev --name remove_permission_tables
```

#### Task 7.4: Verify Database
```sql
-- Verify tables are gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('permissions', 'role_permissions');

-- Should return 0 rows
```

---

### Phase 8: Code Cleanup (2 hours)

#### Task 8.1: Remove Permission API Files
```bash
rm -rf src/app/api/permissions
rm src/app/api/roles/[id]/permissions/route.ts (or update to use capabilities)
```

#### Task 8.2: Remove Legacy Scripts
Review and remove/update:
- `/scripts/analyze-permission-system.ts`
- `/scripts/test-role-update.ts` (if uses permissions)
- `/scripts/clear-and-reseed.ts` (if uses permissions)

#### Task 8.3: Update Documentation
Files to update:
- `README.md` - Remove permission references
- `UNIFIED_RBAC_SYSTEM.md` - Update to capability-only
- `UNIFIED_RBAC_QUICK_REFERENCE.md` - Remove permission docs
- All Phase documents - Update authorization examples

#### Task 8.4: Search & Destroy
```bash
# Find any remaining permission references
grep -r "session.user.permissions" src/
grep -r "prisma.permission" src/
grep -r "rolePermissions" src/
grep -r "RolePermission" src/

# Each match needs to be reviewed and migrated
```

---

### Phase 9: Deployment & Monitoring (Ongoing)

#### Task 9.1: Deployment Checklist
```markdown
## Pre-Deploy
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Database backup created
- [ ] Rollback plan ready
- [ ] Team notified

## Deploy Steps
1. [ ] Run migration script (migrate permissions to capabilities)
2. [ ] Deploy new code
3. [ ] Run database migration (prisma migrate deploy)
4. [ ] Verify application starts
5. [ ] Test login with each role
6. [ ] Monitor logs for errors

## Post-Deploy
- [ ] Monitor error logs (first 24 hours)
- [ ] Check session creation/refresh
- [ ] Verify capability loading performance
- [ ] Check database query performance
- [ ] User acceptance testing
```

#### Task 9.2: Monitoring Queries
```sql
-- Check capability assignments
SELECT 
  r.name as role,
  COUNT(rca.capability_id) as capability_count
FROM roles r
LEFT JOIN role_capability_assignments rca ON r.id = rca.role_id
GROUP BY r.id, r.name
ORDER BY r.name;

-- Check for orphaned records
SELECT * FROM role_capability_assignments
WHERE role_id NOT IN (SELECT id FROM roles);

SELECT * FROM role_capability_assignments
WHERE capability_id NOT IN (SELECT id FROM role_capabilities);
```

---

## 🚨 Rollback Plan

### If Migration Fails

#### Step 1: Restore Database Backup
```bash
psql $DATABASE_URL < backup_before_migration.sql
```

#### Step 2: Revert Code Changes
```bash
git revert <migration-commit-hash>
git push origin main
```

#### Step 3: Restore Prisma Schema
```bash
git checkout HEAD~1 prisma/schema.prisma
npx prisma generate
```

#### Step 4: Redeploy Previous Version
Follow standard deployment process with previous commit.

---

## 📈 Success Metrics

### Performance
- [ ] Session load time < 100ms (unchanged)
- [ ] Capability check time < 1ms
- [ ] No N+1 queries in capability loading

### Functionality
- [ ] 100% feature parity with permission-based system
- [ ] Zero authorization bypass bugs
- [ ] All roles work as expected

### Code Quality
- [ ] Zero `session.user.permissions` references
- [ ] Zero `prisma.permission` queries
- [ ] All API routes use `hasCapability()`
- [ ] TypeScript compiles with no errors

### User Experience
- [ ] No broken features
- [ ] No additional login required
- [ ] No performance degradation
- [ ] Users don't notice the change

---

## 📚 Reference Documentation

### Related Documents
- `/docs/UNIFIED_RBAC_SYSTEM.md` - Current RBAC architecture
- `/docs/UNIFIED_RBAC_MIGRATION_GUIDE.md` - Previous migration docs
- `/CAPABILITY_SYSTEM_README.md` - Capability system overview
- `/ROLE_SYSTEM_AMBIGUITY_REPORT.md` - Analysis of dual-system issues

### Helper Scripts Created
- `/scripts/audit-permission-usage.ts` - Find all permission usage
- `/scripts/create-missing-capabilities.ts` - Ensure capability coverage
- `/scripts/migrate-permissions-to-capabilities.ts` - Main migration script
- `/scripts/audit-post-migration.ts` - Verify migration success
- `/scripts/test-capability-migration.ts` - Automated testing

---

## 🎯 Next Steps

1. **Review this document** with team
2. **Schedule migration** (recommended: off-peak hours)
3. **Create database backup**
4. **Start with Phase 1** (Preparation)
5. **Execute phases sequentially**
6. **Test thoroughly** after each phase
7. **Monitor closely** post-deployment

---

## ✅ Migration Checklist

### Phase 1: Preparation ⏱️ 4 hours
- [ ] Task 1.1: Create permission→capability mapping document
- [ ] Task 1.2: Audit all permission usage locations
- [ ] Task 1.3: Create missing capabilities in database

### Phase 2: Database & Types ⏱️ 3 hours
- [ ] Task 2.1: Update Prisma schema (comment out Permission models)
- [ ] Task 2.2: Update NextAuth types (remove permissions)
- [ ] Task 2.3: Create & test migration script

### Phase 3: NextAuth ⏱️ 2 hours
- [ ] Task 3.1: Update JWT callback (remove rolePermissions)
- [ ] Task 3.2: Update session callback (remove permissions)
- [ ] Task 3.3: Update refresh logic (rename to capabilities)

### Phase 4: API Routes ⏱️ 4 hours
- [ ] Task 4.1: Update document status routes (3 files)
- [ ] Task 4.2: Deprecate permission API endpoints (4 files)

### Phase 5: Hooks & Components ⏱️ 2 hours
- [ ] Task 5.1: Update useRoleVisibility hook
- [ ] Task 5.2: Update role-based-header component
- [ ] Task 5.3: Update/remove debug-permissions endpoint

### Phase 6: Testing ⏱️ 4 hours
- [ ] Task 6.1: Create automated test suite
- [ ] Task 6.2: Manual testing checklist (all roles)
- [ ] Task 6.3: Run post-migration audit script

### Phase 7: Database Cleanup ⏱️ 1 hour
- [ ] Task 7.1: Backup Permission tables to _backup tables
- [ ] Task 7.2: Remove Permission models from schema
- [ ] Task 7.3: Generate & run migration
- [ ] Task 7.4: Verify tables dropped successfully

### Phase 8: Code Cleanup ⏱️ 2 hours
- [ ] Task 8.1: Remove /api/permissions directory
- [ ] Task 8.2: Remove/update legacy scripts
- [ ] Task 8.3: Update all documentation
- [ ] Task 8.4: Search & remove remaining references

### Phase 9: Deployment ⏱️ Ongoing
- [ ] Task 9.1: Execute deployment checklist
- [ ] Task 9.2: Monitor system for 24 hours

---

**Total Estimated Time:** 22 hours (~3 working days)

**Risk Level:** Medium (good test coverage reduces risk)

**Reversibility:** High (can rollback with database restore)

---

*Last Updated: January 2, 2026*
