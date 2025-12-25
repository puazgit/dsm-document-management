# Priority 1 Implementation Analysis

## 📊 Current State Analysis

### Role Name Checks - Files Affected (20 locations)

**Core Files:**
1. ✅ src/lib/document-access.ts (2 locations)
   - Line 50: `user.role === 'admin' || user.role === 'org_administrator'`
   - Line 179: `role === 'admin' || role === 'org_administrator'`

2. ✅ src/lib/next-auth.ts (1 location)
   - Line 132: `(user as any).role === 'admin'`

3. ✅ src/config/roles.ts (1 location)
   - Line 154: `userRole === 'admin'`

4. ✅ src/config/document-workflow.ts (2 locations)
   - Line 214: `userRole === 'administrator' || userRole === 'admin'`
   - Line 263: `userRole === 'administrator' || userRole === 'admin'`

**API Routes:**
5. ✅ src/app/api/users/route.ts (1 location)
6. ✅ src/app/api/users/[id]/route.ts (2 locations)
7. ✅ src/app/api/documents/upload/route.ts (1 location)
8. ✅ src/app/api/documents/[id]/route.ts (1 location)
9. ✅ src/app/api/documents/stats/route.ts (2 locations)
10. ✅ src/app/api/documents/[id]/approve/route.ts (1 location)
11. ✅ src/app/api/documents/[id]/status/route.ts (2 locations)
12. ✅ src/app/api/documents/[id]/comments/route.ts (2 locations)

**UI Components:**
13. ✅ src/app/admin/pdf-permissions/page.tsx (3 locations - color mapping)

**Current Roles in Database:**
```typescript
// From prisma/seeds/roles-permissions.ts
- admin (level 100)
- manager (level 70)
- editor (level 50)
- viewer (level 30)
- guest (level 10)
```

### Workflow Level Thresholds - Files Affected

**Core Config:**
1. ✅ src/config/document-workflow.ts
   - DRAFT → PENDING_REVIEW: minLevel 50
   - PENDING_REVIEW → PENDING_APPROVAL: minLevel 70
   - PENDING_APPROVAL → APPROVED: minLevel 70
   - APPROVED → PUBLISHED: minLevel 100
   - etc. (8 transitions total)

**API Integration:**
2. ✅ src/app/api/documents/[id]/status/route.ts
   - Line 365: `userLevel >= 70`

**UI Components:**
3. ✅ src/components/admin/user-group-assignment.tsx
   - Lines 231-233: Level thresholds for badges

4. ✅ src/app/admin/groups/page.tsx
   - Lines 238-241: Level thresholds for colors

---

## 🗂️ Database Schema Design

### Schema 1: Role Capabilities System

```prisma
// Add to schema.prisma

model RoleCapability {
  id          String   @id @default(cuid())
  name        String   @unique // e.g., 'ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS'
  description String?
  category    String?  // 'system', 'document', 'user', etc.
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  assignments RoleCapabilityAssignment[]

  @@map("role_capabilities")
}

model RoleCapabilityAssignment {
  roleId       String @map("role_id")
  capabilityId String @map("capability_id")

  role       Role           @relation(fields: [roleId], references: [id], onDelete: Cascade)
  capability RoleCapability @relation(fields: [capabilityId], references: [id], onDelete: Cascade)

  @@id([roleId, capabilityId])
  @@map("role_capability_assignments")
}
```

**Seed Data:**
```typescript
const capabilities = [
  {
    name: 'ADMIN_ACCESS',
    description: 'Full administrative access to all system features',
    category: 'system'
  },
  {
    name: 'DOCUMENT_FULL_ACCESS',
    description: 'Full access to all documents regardless of ownership',
    category: 'document'
  },
  {
    name: 'DOCUMENT_MANAGE',
    description: 'Manage document lifecycle and workflows',
    category: 'document'
  },
  {
    name: 'USER_MANAGE',
    description: 'Manage users and their assignments',
    category: 'user'
  },
  {
    name: 'ROLE_MANAGE',
    description: 'Manage roles and permissions',
    category: 'user'
  }
];

// Assignments
admin role → ['ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS', 'DOCUMENT_MANAGE', 'USER_MANAGE', 'ROLE_MANAGE']
manager role → ['DOCUMENT_MANAGE', 'USER_MANAGE']
editor role → ['DOCUMENT_MANAGE'] (dengan full permissions jadi ada DOCUMENT_FULL_ACCESS juga)
```

### Schema 2: Workflow Transitions

```prisma
// Add to schema.prisma

model WorkflowTransition {
  id                 String   @id @default(cuid())
  fromStatus         String   @map("from_status") // 'DRAFT', 'PENDING_REVIEW', etc.
  toStatus           String   @map("to_status")
  minLevel           Int      @map("min_level")
  requiredPermission String?  @map("required_permission")
  description        String?
  allowedByLabel     String?  @map("allowed_by_label") // Display label like "Editor, Manager"
  isActive           Boolean  @default(true) @map("is_active")
  sortOrder          Int      @default(0) @map("sort_order")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@unique([fromStatus, toStatus])
  @@index([fromStatus])
  @@index([isActive])
  @@map("workflow_transitions")
}
```

**Seed Data from current workflow:**
```typescript
const transitions = [
  { fromStatus: 'DRAFT', toStatus: 'PENDING_REVIEW', minLevel: 50, requiredPermission: 'documents.update', description: 'Submit for review', allowedByLabel: 'Editor+' },
  { fromStatus: 'PENDING_REVIEW', toStatus: 'PENDING_APPROVAL', minLevel: 70, requiredPermission: 'documents.update', description: 'Forward for approval', allowedByLabel: 'Manager+' },
  { fromStatus: 'PENDING_APPROVAL', toStatus: 'APPROVED', minLevel: 70, requiredPermission: 'documents.approve', description: 'Approve document', allowedByLabel: 'Manager+' },
  { fromStatus: 'APPROVED', toStatus: 'PUBLISHED', minLevel: 100, requiredPermission: 'documents.approve', description: 'Publish document', allowedByLabel: 'Admin' },
  { fromStatus: 'PENDING_REVIEW', toStatus: 'DRAFT', minLevel: 50, requiredPermission: 'documents.update', description: 'Send back to draft', allowedByLabel: 'Editor+' },
  { fromStatus: 'PENDING_APPROVAL', toStatus: 'PENDING_REVIEW', minLevel: 70, requiredPermission: 'documents.update', description: 'Request revision', allowedByLabel: 'Manager+' },
  { fromStatus: 'PENDING_APPROVAL', toStatus: 'REJECTED', minLevel: 70, requiredPermission: 'documents.approve', description: 'Reject document', allowedByLabel: 'Manager+' },
  { fromStatus: 'PUBLISHED', toStatus: 'ARCHIVED', minLevel: 100, requiredPermission: 'documents.delete', description: 'Archive document', allowedByLabel: 'Admin' }
];
```

---

## 🔄 Migration Impact Analysis

### Database Changes:
- ✅ Add 3 new tables
- ✅ Add relations to existing Role table
- ✅ Backward compatible (no breaking changes)

### Code Changes Required:
- ✅ Update schema.prisma (2 new models)
- ✅ Create migration files (1 for capabilities, 1 for workflows)
- ✅ Create seed scripts (2 files)
- ✅ Update 13 files with hardcoded role checks
- ✅ Update 1 workflow config file
- ✅ Create 2 new utility functions
- ✅ Create 1 admin UI page (optional Phase 1)

### Testing Requirements:
- ✅ Test role capability checks
- ✅ Test workflow transitions
- ✅ Test backward compatibility
- ✅ Test permission system still works
- ✅ Test legal user access

### Risk Assessment:
- 🟡 Medium Risk: Many files touched
- ✅ Mitigated: All changes are additive, not removing old code yet
- ✅ Rollback: Can revert to old code easily
- ✅ Testing: Comprehensive test suite available

---

## 📝 Implementation Steps Summary

### Phase 1A: Role Capabilities (Est: 4-6 hours)
1. Update schema.prisma ✅
2. Generate migration ✅
3. Create seed data ✅
4. Run migration & seed ✅
5. Create utility function ✅
6. Update 2-3 critical files first ✅
7. Test ✅
8. Update remaining files ✅

### Phase 1B: Workflow Transitions (Est: 3-4 hours)
1. Update schema.prisma ✅
2. Generate migration ✅
3. Create seed from current config ✅
4. Run migration & seed ✅
5. Update document-workflow.ts ✅
6. Update status API route ✅
7. Test ✅

### Phase 1C: Admin UI (Est: 4-6 hours - Optional)
1. Create /admin/capabilities page ✅
2. Create /admin/workflows page ✅
3. API endpoints for CRUD ✅

**Total Estimated Time: 12-16 hours (2 days)**

---

## ⚠️ Breaking Changes & Compatibility

### None! 
- All changes are **additive**
- Old code will continue to work
- Can gradually migrate file by file
- Rollback strategy: just don't use new tables

### Compatibility Matrix:
| Component | Before | After | Compatible? |
|-----------|--------|-------|-------------|
| Role checks | Hardcoded strings | DB + fallback to hardcoded | ✅ Yes |
| Workflow | Config file | DB + fallback to config | ✅ Yes |
| Permissions | Session-based | Session-based | ✅ Yes |
| Database | 8 tables | 11 tables | ✅ Yes |

---

## 🎯 Success Criteria

### Phase 1A Success:
- [ ] Migration runs without errors
- [ ] All 5 capabilities seeded
- [ ] hasCapability() function works
- [ ] legal@dsm.com still has full document access
- [ ] All existing tests pass

### Phase 1B Success:
- [ ] Migration runs without errors
- [ ] All 8 workflow transitions seeded
- [ ] Workflow queries database first
- [ ] Document status changes still work
- [ ] All existing tests pass

### Overall Success:
- [ ] Zero production incidents
- [ ] No regression in features
- [ ] Performance impact < 50ms
- [ ] Code cleaner and more maintainable

---

Ready to proceed with implementation! 🚀
