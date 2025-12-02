# Role/Group System Unification - Phase 1 Implementation

## 📋 Overview

This document outlines the first phase of unifying the Role/Group concept in the DSM application. The main goal is to eliminate confusion between "roles" and "groups" by establishing a clear, centralized system.

## 🔄 Key Changes Made

### 1. Centralized Role Configuration (`/src/config/roles.ts`)

**Purpose**: Single source of truth for all role definitions, permissions, and hierarchy.

**Features**:
- ✅ 10 organizational roles with clear hierarchy (level-based)
- ✅ Permission-based access control
- ✅ Role normalization (handles case variations and aliases)
- ✅ Wildcard permission support (`documents.*`)
- ✅ Type-safe role definitions

**Role Hierarchy** (higher level = more permissions):
```typescript
administrator: 100  // Full system access
ppd:          90   // Document management + user management
kadiv:        80   // Division head with approval authority
gm:           70   // General Manager
manager:      60   // Management level
dirut:        50   // Director
dewas:        40   // Board of Supervisors
komite_audit: 30   // Audit Committee
members:      20   // Regular members
viewer:       10   // Read-only access
```

### 2. Unified Authorization Utilities (`/src/lib/auth-utils.ts`)

**Purpose**: Replace scattered hardcoded role checks with centralized authorization logic.

**Key Functions**:
- `requireRoles(roles[])` - API route wrapper for role-based auth
- `requirePermission(permission)` - API route wrapper for permission-based auth
- `checkRoleAccess(request, roles[])` - Check if user has required role access
- `checkPermissionAccess(request, permission)` - Check if user has specific permission
- `getCurrentUser(request)` - Get normalized user info from session

**Usage Example**:
```typescript
// OLD (hardcoded, inconsistent)
const allowedRoles = ['administrator', 'ppd']
if (!allowedRoles.includes(userRole?.toLowerCase())) {
  return NextResponse.json({error: 'Forbidden'}, {status: 403})
}

// NEW (centralized, hierarchy-aware)
export const GET = requireRoles(['administrator', 'ppd'])(async function(request) {
  // implementation here
})
```

### 3. Updated Middleware (`/src/middleware.ts`)

**Changes**:
- ✅ Uses centralized role configuration
- ✅ Supports role hierarchy (higher roles inherit lower role access)
- ✅ Handles role name normalization
- ✅ Better error logging with context
- ✅ Clearer documentation

**Before**:
```typescript
const hasGroupAccess = requiredGroups.includes(userGroup)
```

**After**:
```typescript
const hasAccess = hasRoleAccess(userRole, requiredRoles)
```

### 4. API Endpoints Updated

**Converted to use new authorization system**:
- ✅ `/api/users` (GET, POST)
- ✅ `/api/analytics` (GET) 
- ✅ `/api/roles` (GET, POST)
- ✅ `/api/roles/[id]` (GET, PUT, DELETE)

**Before** (inconsistent hardcoded checks):
```typescript
const allowedRoles = ['administrator', 'manager']
const userRole = session.user.role?.toLowerCase()
if (!allowedRoles.includes(userRole || '')) {
  return NextResponse.json({message: 'Forbidden'}, {status: 403})
}
```

**After** (centralized, declarative):
```typescript
export const GET = requireRoles(['administrator', 'manager'])(async function(request) {
  // User object available as (request as any).user
})
```

## 🔧 Technical Implementation Details

### Role Hierarchy Implementation

The system now uses **level-based hierarchy** where higher level roles automatically inherit access from lower level roles:

```typescript
// User with 'manager' role (level 60) can access routes requiring:
// - manager (60), dirut (50), dewas (40), komite_audit (30), members (20), viewer (10)
// But CANNOT access routes requiring:
// - kadiv (80), ppd (90), administrator (100)

hasRoleAccess('manager', ['viewer', 'members']) // ✅ true
hasRoleAccess('manager', ['administrator'])     // ❌ false
```

### Permission System Foundation

Although not fully implemented in this phase, the foundation is laid:

```typescript
// Future permission-based approach
export const GET = requirePermission('analytics.read')(async function(request) {
  // Will check user's role permissions from centralized config
})
```

### Backward Compatibility

The system maintains backward compatibility through:

```typescript
export const LEGACY_ROLE_MAPPINGS = {
  admin: ['administrator'],
  ADMIN: ['administrator'], 
  manager: ['manager', 'kadiv', 'gm'],
  // ... etc
}
```

## 🚀 Benefits Achieved

### 1. **Consistency**
- ✅ No more case sensitivity issues (`admin` vs `ADMIN` vs `administrator`)
- ✅ Centralized role definitions
- ✅ Consistent API responses and error messages

### 2. **Maintainability**
- ✅ Single place to update role permissions
- ✅ Type-safe role definitions
- ✅ Clear role hierarchy documentation

### 3. **Security**
- ✅ Reduced risk of authorization bypass
- ✅ Centralized security logic
- ✅ Better audit trail capabilities

### 4. **Developer Experience**
- ✅ Declarative API authorization (`requireRoles()`)
- ✅ Clear role hierarchy understanding
- ✅ Reduced boilerplate code

## 📝 Usage Examples

### API Route Authorization

```typescript
// Simple role check
export const GET = requireRoles(['administrator', 'ppd'])(async function(request) {
  const user = (request as any).user // Available in handler
  // ... implementation
})

// Permission-based (future)
export const POST = requirePermission('documents.create')(async function(request) {
  // Will be automatically authorized based on user's role permissions
})
```

### Conditional Logic

```typescript
// In components or other logic
import { hasRoleAccess, getRoleConfig } from '@/config/roles'

const userCanEdit = hasRoleAccess(userRole, ['administrator', 'ppd'])
const roleConfig = getRoleConfig(userRole)
const hasDocumentPermission = hasPermission(userRole, 'documents.create')
```

## 🔜 Next Steps (Phase 2)

1. **Replace remaining hardcoded role checks** in other API endpoints
2. **Implement full permission-based authorization** 
3. **Add UI for role/permission management**
4. **Database schema cleanup** (consolidate Group vs Role approach)
5. **Enhanced audit logging** for role-based actions

## ⚠️ Breaking Changes

### For Developers

1. **API Route Functions**: Changed from `export async function` to `export const = requireRoles()()`
2. **Session Access**: Use `(request as any).user` instead of `getServerSession()` in wrapped handlers
3. **Role Names**: Must use normalized role names (lowercase, no aliases)

### For System Administrators

1. **Role Names**: System now uses consistent lowercase role names
2. **Permission Logic**: Role hierarchy is now enforced (higher roles inherit lower role access)

## 🛠️ Configuration

### Adding New Role

```typescript
// In /src/config/roles.ts
export const ROLES: Record<string, RoleConfig> = {
  // ... existing roles
  new_role: {
    name: 'new_role',
    displayName: 'New Role Display Name',
    level: 25, // Set appropriate hierarchy level
    permissions: ['documents.read', 'users.read'],
    description: 'Description of the new role'
  }
}
```

### Adding New Permission

```typescript
// In role configuration
permissions: [
  'existing.permission',
  'new.module.action' // Add new permission here
]
```

### Adding New Protected Route

```typescript
// In /src/middleware.ts
const protectedRoutes: Record<string, string[]> = {
  // ... existing routes
  '/new-protected-path': ['administrator', 'manager'],
}
```

This completes Phase 1 of the Role/Group unification. The system is now more consistent, secure, and maintainable, with a clear foundation for future enhancements.