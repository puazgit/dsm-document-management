# 🚨 Laporan Ambiguitas Sistem Role - RBAC DSM

**Tanggal:** 1 Januari 2026  
**Status:** 🔴 CRITICAL - Ada konflik konseptual major

---

## ❌ MASALAH UTAMA: DUALITAS SISTEM ROLE

### Konflik Konseptual

Sistem ini memiliki **DUALITAS** yang membingungkan:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODERN RBAC (Tabel: roles)                   │
│  User → UserRole → Role → RoleCapabilityAssignment → Capability │
│                                                                   │
│  ✅ Database-driven                                              │
│  ✅ Flexible capability assignments                             │
│  ✅ Granular permissions                                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 LEGACY SYSTEM (Tabel: groups)                   │
│              User → Group → session.user.role                   │
│                                                                   │
│  ⚠️  Legacy backward compatibility                              │
│  ⚠️  Hardcoded in middleware                                    │
│  ⚠️  Stores group.name as "role"                                │
└─────────────────────────────────────────────────────────────────┘
```

**❗ CRITICAL:** `session.user.role` **BUKAN** role dari tabel `roles`!  
**❗ CRITICAL:** `session.user.role` **ISI-nya** adalah `group.name` dari tabel `groups`!

---

## 🔴 AMBIGUITAS #1: "ppd" vs "ppd.pusat" vs "ppd.unit"

### Hardcode yang Tidak Konsisten

#### **File: /src/app/api/users/[id]/roles/route.ts** (Line 43, 208, 358)
```typescript
// ❌ MENGGUNAKAN 'ppd' (tanpa .pusat atau .unit)
const canAssignRoles = requestingUser?.userRoles.some(ur => 
  ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
) || requestingUser?.group?.name === 'administrator'
```

**Pertanyaan:**
- ❓ Apakah `'ppd'` ini merujuk ke `'ppd.pusat'` atau `'ppd.unit'` atau keduanya?
- ❓ Apakah ada role `'ppd'` di database yang terpisah dari `'ppd.pusat'` dan `'ppd.unit'`?
- ❓ Bagaimana jika user memiliki role `'ppd.pusat'` tapi cek hardcode ini cari `'ppd'`?

#### **File: /src/middleware.ts** (Line 13-21)
```typescript
// ✅ MENGGUNAKAN 'ppd.pusat' dan 'ppd.unit' (konsisten dengan database)
const protectedRoutes: Record<string, string[]> = {
  '/admin': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  '/admin/users': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
  // ...
}
```

#### **File: /src/config/roles.ts** (Line 220)
```typescript
// Ada alias untuk 'PPD' tapi tidak jelas mappingnya
const roleAliases: Record<string, string> = {
  'PPD': 'ppd',  // ❌ Map ke 'ppd' (yang tidak ada di ROLES)
  'ppd.pusat': 'ppd.pusat',
  'ppd.unit': 'ppd.unit',
  // ...
}
```

#### **File: /src/app/api/groups/[id]/route.ts** (Line 215)
```typescript
// ❌ Cek group.name === 'ppd' untuk prevent deletion
if (group.name === 'administrator' || group.name === 'ppd') {
  return NextResponse.json(
    { error: 'Cannot delete system groups' },
    { status: 403 }
  )
}
```

**❓ Apakah ada group bernama 'ppd' di database, atau ini typo?**

---

## 🟡 AMBIGUITAS #2: Mixing `userRoles` dan `group` Checks

### Contoh Inconsistency

#### **File: /src/app/api/users/[id]/roles/route.ts** (Line 43-44)
```typescript
// Cek KEDUANYA: userRoles DAN group
const canAssignRoles = requestingUser?.userRoles.some(ur => 
  ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
) || requestingUser?.group?.name === 'administrator'
//    ↑↑↑ Modern RBAC (roles table)
//                                  ↑↑↑ Legacy system (groups table)
```

**Masalah:**
1. **Double checking** yang tidak efisien
2. **Tidak jelas** mana yang prioritas
3. **Sulit di-maintain** karena harus update 2 tempat
4. **Bisa conflict** jika user punya role tapi tidak punya group atau sebaliknya

#### **File: /src/app/api/users/[id]/group/route.ts** (Line 40)
```typescript
// Sama, mixing userRoles dengan group
const canAssignGroups = currentUser?.userRoles.some(ur => 
  ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
) || currentUser?.group?.name === 'administrator'
```

**❓ Jika user memiliki:**
- `userRoles = [{ role: { name: 'manager' } }]`
- `group = null`

**Apakah dia bisa assign roles? YA**

**❓ Jika user memiliki:**
- `userRoles = []`
- `group = { name: 'administrator' }`

**Apakah dia bisa assign roles? YA**

**❓ Mana yang benar? Mana yang intended behavior?**

---

## 🟡 AMBIGUITAS #3: Session Role vs Database Roles

### Session Stores Group Name as "role"

#### **From: /src/config/roles.ts** (Line 1-7)
```typescript
/**
 * Centralized Role/Group Configuration
 * 
 * Note: In this system, "Groups" act as "Roles" for organizational simplicity.
 * - Users belong to Groups (organizational units)
 * - Groups have hierarchical levels and permissions
 * - Session stores group name as "role" for backward compatibility
 */
```

**Masalah:**
- Dokumentasi mengatakan "Groups act as Roles"
- Tapi ada tabel `roles` yang terpisah dengan capability system
- `session.user.role` berisi `group.name`, bukan `role.name`
- API routes kadang cek `session.user.role`, kadang cek `userRoles.role.name`

### Contoh Konflik

#### **File: /src/middleware.ts** (Line 102)
```typescript
// Middleware menggunakan session.user.role (yang isinya group.name)
const userRole = normalizeRoleName(token.role as string || '')
```

#### **File: /src/app/api/users/[id]/roles/route.ts** (Line 43)
```typescript
// API menggunakan userRoles.role.name (dari tabel roles)
const canAssignRoles = requestingUser?.userRoles.some(ur => 
  ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
)
```

**❗ CRITICAL:** Dua sistem berbeda untuk authorization!

---

## 🟠 AMBIGUITAS #4: Role Levels Not Aligned

### Config vs Database Levels

#### **File: /src/config/roles.ts**
```typescript
'ppd.pusat': {
  name: 'ppd.pusat',
  level: 100,  // ← Sama dengan admin
  // ...
},
'ppd.unit': {
  name: 'ppd.unit',
  level: 70,
  // ...
}
```

#### **From Database Seed**
```typescript
// prisma/seeds/assign-role-capabilities.ts
{
  roleName: 'ppd.pusat',
  capabilities: [/* 17 capabilities */]
},
{
  roleName: 'ppd.unit',
  capabilities: [/* 7 capabilities */]
}
```

**Masalah:**
- `ppd.pusat` level 100 (sama dengan admin) tapi hanya 17 capabilities (admin punya 21)
- Level di config tidak reflect actual capabilities
- **Misleading:** Level tinggi ≠ More capabilities

---

## 🟠 AMBIGUITAS #5: Hardcoded Role Names Everywhere

### Tidak Ada Single Source of Truth

#### **Locations dengan Hardcoded Role Names:**

1. **Middleware** (`/src/middleware.ts`):
   ```typescript
   '/admin': ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
   ```

2. **Navigation** (`/src/lib/navigation.ts`):
   ```typescript
   requiredRoles: ['admin', 'administrator', 'ppd.pusat', 'ppd.unit'],
   ```

3. **API Routes** (Multiple files):
   ```typescript
   ['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
   ```

4. **Components** (`/src/components/app-sidebar.tsx`):
   ```typescript
   <RoleGuard requiredRoles={['admin', 'administrator', 'ppd.pusat', 'ppd.unit']}>
   ```

5. **Config** (`/src/config/roles.ts`):
   ```typescript
   export const ROLES: Record<string, RoleConfig> = {
     admin: { ... },
     'ppd.pusat': { ... },
     // ...
   }
   ```

**Masalah:**
- Jika tambah role baru, harus update **5+ locations**
- Typo di satu tempat = broken access control
- Tidak DRY (Don't Repeat Yourself)
- Maintenance nightmare

---

## 🔴 AMBIGUITAS #6: "administrator" vs "admin"

### Dua Role dengan Level Sama

#### **File: /src/config/roles.ts**
```typescript
admin: {
  name: 'admin',
  level: 100,
  permissions: ['*'],
  description: 'Full system access and administration privileges'
},
administrator: {
  name: 'administrator',
  level: 100,
  permissions: ['*'],
  description: 'Full organizational system access'
}
```

**Pertanyaan:**
- ❓ Apa bedanya `admin` vs `administrator`?
- ❓ Kenapa butuh 2 role dengan level & permissions sama persis?
- ❓ Apakah `admin` = superuser dan `administrator` = org admin?
- ❓ Tidak ada dokumentasi yang menjelaskan perbedaannya

#### **In API Routes:**
```typescript
// Kadang cek keduanya
['admin', 'administrator'].includes(userRole)

// Kadang hanya 'administrator'
['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
```

**❗ INCONSISTENT:** Kadang `admin` dikasih akses, kadang tidak

---

## 🟡 AMBIGUITAS #7: Group System Purpose Unclear

### Apakah Group = Role atau Group = Organization Unit?

#### **From Schema: /prisma/schema.prisma**
```prisma
model User {
  // ...
  groupId     String?  // Organizational group
  userRoles   UserRole[]  // RBAC roles
  group       Group?
}

model Group {
  id          String
  name        String   @unique  // Stored as session.user.role
  displayName String
  users       User[]
}
```

#### **From Documentation: /src/config/roles.ts**
```typescript
/**
 * Note: In this system, "Groups" act as "Roles" for organizational simplicity.
 */
```

**Masalah:**
- Dokumentasi bilang "Groups act as Roles"
- Tapi ada sistem `UserRole → Role` yang terpisah
- User bisa punya `group` DAN multiple `userRoles`
- **Tidak jelas:** Apakah group untuk organization structure atau access control?

**Contoh User:**
```typescript
{
  id: 'user-123',
  group: { name: 'tik' },  // ← Organizational unit?
  userRoles: [
    { role: { name: 'ppd.unit' } },  // ← Access control?
    { role: { name: 'editor' } }
  ]
}
```

**❓ `group = 'tik'` artinya apa?**  
**❓ Apakah `group` mempengaruhi access control?**  
**❓ Jika yes, bagaimana interaksinya dengan `userRoles`?**

---

## 📊 RINGKASAN TEMUAN

### Critical Issues (🔴)

| # | Issue | Impact | Files Affected |
|---|-------|--------|----------------|
| 1 | **Dualitas Sistem** | CRITICAL | All auth-related files |
| 2 | **'ppd' vs 'ppd.pusat'** | HIGH | 5+ API routes |
| 3 | **Session role ≠ DB role** | HIGH | Middleware, APIs |
| 4 | **'admin' vs 'administrator'** | MEDIUM | Config, APIs |

### High Priority Issues (🟡)

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| 5 | **Mixing userRoles & group checks** | HIGH | Use ONE system |
| 6 | **Role levels misleading** | MEDIUM | Align with capabilities |
| 7 | **Hardcoded role names** | MEDIUM | Centralize definitions |
| 8 | **Group purpose unclear** | MEDIUM | Document clearly |

---

## 💡 REKOMENDASI

### 1. **PILIH SATU SISTEM** (Critical)

**Option A: Modern RBAC Only**
```typescript
// Hapus dependency ke groups untuk access control
// Gunakan HANYA userRoles + capabilities
const hasAccess = await UnifiedAccessControl.hasCapability(
  userId, 
  'ROLE_MANAGE'
)
```

**Option B: Hybrid dengan Dokumentasi Jelas**
```typescript
// Groups = Organizational structure (tik, finance, hr, etc.)
// Roles = Access control (admin, ppd.pusat, manager, etc.)
// Dokumentasikan dengan jelas kapan pakai apa
```

### 2. **Standardisasi 'ppd' Naming** (High Priority)

**Pilihan:**
- Ganti semua `'ppd'` hardcode → `'ppd.pusat'` atau `'ppd.unit'`
- ATAU buat helper function:
  ```typescript
  function isPpdRole(roleName: string): boolean {
    return ['ppd', 'ppd.pusat', 'ppd.unit'].includes(roleName)
  }
  ```

### 3. **Centralize Role Checks** (High Priority)

**Sekarang:**
```typescript
// ❌ Hardcoded di 10+ files
['administrator', 'ppd', 'manager', 'kadiv'].includes(ur.role.name)
```

**Harusnya:**
```typescript
// ✅ Centralized constant
// /src/config/role-permissions.ts
export const ROLE_PERMISSIONS = {
  CAN_ASSIGN_ROLES: ['administrator', 'ppd.pusat', 'manager', 'kadiv'],
  CAN_MANAGE_USERS: ['administrator', 'ppd.pusat', 'ppd.unit'],
  CAN_DELETE_DOCS: ['administrator', 'ppd.pusat'],
}

// Usage
ROLE_PERMISSIONS.CAN_ASSIGN_ROLES.includes(ur.role.name)
```

### 4. **Dokumentasi Role Hierarchy** (Medium Priority)

Buat file `ROLE_SYSTEM_GUIDE.md` yang menjelaskan:
- Perbedaan `admin` vs `administrator`
- Kapan pakai `group` vs `userRoles`
- Hierarchy & level meanings
- Capability mappings

### 5. **Database Audit** (High Priority)

Check apakah ada:
- Role bernama `'ppd'` (tanpa .pusat/.unit)
- Group bernama `'ppd'`
- Orphaned users (punya group tapi tidak ada userRoles, atau sebaliknya)

### 6. **Type Safety** (Medium Priority)

```typescript
// Buat enum atau union type
export type SystemRole = 
  | 'admin' 
  | 'administrator' 
  | 'ppd.pusat' 
  | 'ppd.unit'
  | 'manager'
  | 'kadiv'
  | 'editor'
  | 'viewer'
  | 'guest'

// Gunakan di API routes
function checkRoleAccess(role: SystemRole): boolean {
  // TypeScript akan error jika typo
}
```

---

## 🎯 ACTION ITEMS

### Immediate (This Sprint)

- [ ] **Audit database:** Query semua roles & groups, check for `'ppd'` (without suffix)
- [ ] **Search & Replace:** Standardize `'ppd'` → `'ppd.pusat'` di semua API routes
- [ ] **Document:** Buat `ROLE_SYSTEM_GUIDE.md` explaining dual system
- [ ] **Fix inconsistency:** Decide whether to check `group` or `userRoles` for auth

### Short-term (Next 2 Sprints)

- [ ] **Centralize:** Create `ROLE_PERMISSIONS` constants
- [ ] **Refactor:** Update all API routes to use centralized constants
- [ ] **Test:** Write integration tests for role-based access
- [ ] **Clarify:** Document difference between `admin` vs `administrator`

### Long-term (Next Quarter)

- [ ] **Migrate:** Phase out `group`-based auth, use only `userRoles` + capabilities
- [ ] **Type Safety:** Add TypeScript enums for roles
- [ ] **Database-driven:** Remove hardcoded roles from middleware (use resources table)

---

## 📝 NOTES

**Current State:**  
🔴 System has major ambiguity issues that can lead to security holes

**Desired State:**  
✅ Clear, consistent, maintainable role-based access control

**Migration Path:**  
Incremental refactoring over 3 months to avoid breaking changes

---

**Prepared by:** GitHub Copilot (Claude Sonnet 4.5)  
**Date:** January 1, 2026  
**Priority:** 🔴 HIGH - Security implications
