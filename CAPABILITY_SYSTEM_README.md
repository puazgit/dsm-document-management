# Capability-Based Authorization System

**Version:** 2.0  
**Last Updated:** January 1, 2026

---

## Overview

This application uses a **database-driven capability-based authorization system** that eliminates hardcoded role checks throughout the codebase. Instead of checking role names (e.g., `if (user.role === 'admin')`), the system checks **capabilities** (e.g., `if (hasCapability('DOCUMENT_EDIT'))`).

### Key Benefits

- ✅ **Flexible** - Assign any capability to any role without code changes
- ✅ **Maintainable** - Single source of truth in database
- ✅ **Performant** - Capabilities loaded once at login, cached in JWT
- ✅ **Type-Safe** - TypeScript types for all capabilities
- ✅ **Testable** - Easier to test capability combinations

---

## Architecture

```
┌─────────────┐
│   Database  │  ← Source of Truth
│  (Postgres) │
└──────┬──────┘
       │
   ┌───▼───────────────────────────────┐
   │  role_capabilities table           │
   │  - DOCUMENT_VIEW                   │
   │  - DOCUMENT_EDIT                   │
   │  - USER_MANAGE                     │
   │  - ...                             │
   └───┬───────────────────────────────┘
       │
   ┌───▼─────────────────────────────────┐
   │  role_capability_assignments table   │
   │  - admin → [ALL CAPABILITIES]        │
   │  - manager → [DOCUMENT_*, USER_VIEW] │
   │  - editor → [DOCUMENT_VIEW, EDIT]    │
   │  - viewer → [DOCUMENT_VIEW]          │
   └───┬─────────────────────────────────┘
       │
   ┌───▼──────────┐
   │  NextAuth     │  ← Loaded at login
   │  JWT Token    │
   └───┬──────────┘
       │
   ┌───▼─────────────────────────────┐
   │  session.user.capabilities[]     │  ← Available in all layers
   └───┬─────────────────────────────┘
       │
   ┌───▼──────────────────────────────────────────┐
   │  Authorization Checks                         │
   │  ┌────────────────────────────────────────┐  │
   │  │  Navigation   →  Hide/show menu items  │  │
   │  │  Components   →  Conditional rendering │  │
   │  │  API Routes   →  Access control        │  │
   │  │  Middleware   →  Route protection      │  │
   │  └────────────────────────────────────────┘  │
   └───────────────────────────────────────────────┘
```

---

## Available Capabilities

### Document Capabilities

| Capability | Description | Typical Roles |
|-----------|-------------|---------------|
| `DOCUMENT_VIEW` | View documents | All users |
| `DOCUMENT_EDIT` | Edit existing documents | Editor, Manager, Admin |
| `DOCUMENT_CREATE` | Create new documents | Editor, Manager, Admin |
| `DOCUMENT_DELETE` | Delete documents | Manager, Admin |
| `DOCUMENT_DOWNLOAD` | Download documents | Editor, Manager, Admin |
| `DOCUMENT_COMMENT` | Add comments | Editor, Manager, Admin |
| `DOCUMENT_APPROVE` | Approve documents | Manager, Admin |
| `DOCUMENT_MANAGE` | Full document management | Admin |

### User Management Capabilities

| Capability | Description | Typical Roles |
|-----------|-------------|---------------|
| `USER_VIEW` | View user list and profiles | Manager, Admin |
| `USER_MANAGE` | Create, edit, assign roles | Admin |
| `USER_DELETE` | Delete user accounts | Admin |

### Role Management Capabilities

| Capability | Description | Typical Roles |
|-----------|-------------|---------------|
| `ROLE_VIEW` | View roles and capabilities | Admin |
| `ROLE_MANAGE` | Create, edit, delete roles | Admin |

---

## Usage Examples

### 1. React Components

#### Using the `useCapabilities` Hook

```typescript
import { useCapabilities } from '@/hooks/use-capabilities'

function DocumentEditor() {
  const { canEditDocuments, canDeleteDocuments } = useCapabilities()

  return (
    <div>
      {canEditDocuments && <EditButton />}
      {canDeleteDocuments && <DeleteButton />}
    </div>
  )
}
```

#### Using `CapabilityGuard` Component

```typescript
import { CapabilityGuard } from '@/hooks/use-capabilities'

function AdminPanel() {
  return (
    <CapabilityGuard 
      capability="USER_MANAGE"
      fallback={<p>Access Denied</p>}
    >
      <UserManagementUI />
    </CapabilityGuard>
  )
}
```

#### Multiple Capabilities

```typescript
// Require ANY of these capabilities
<CapabilityGuard anyOf={['DOCUMENT_EDIT', 'DOCUMENT_MANAGE']}>
  <EditButton />
</CapabilityGuard>

// Require ALL of these capabilities
<CapabilityGuard allOf={['DOCUMENT_VIEW', 'DOCUMENT_EDIT']}>
  <AdvancedEditor />
</CapabilityGuard>
```

### 2. API Routes

```typescript
import { requireCapability } from '@/lib/rbac-helpers'

export async function POST(request: NextRequest) {
  // Check capability
  const auth = await requireCapability(request, 'DOCUMENT_CREATE')
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // User has capability, proceed with logic
  const document = await createDocument(...)
  return NextResponse.json(document)
}
```

#### Multiple Capabilities in API

```typescript
// Require ANY capability
const auth = await requireAnyCapability(request, [
  'DOCUMENT_MANAGE',
  'DOCUMENT_APPROVE'
])

// Require ALL capabilities
const auth = await requireAllCapabilities(request, [
  'DOCUMENT_VIEW',
  'DOCUMENT_EDIT'
])
```

### 3. Navigation Filtering

```typescript
// src/lib/navigation.ts
export const navigationItems: NavItem[] = [
  {
    title: 'Documents',
    href: '/documents',
    icon: FileText,
    requiredCapabilities: ['DOCUMENT_VIEW']  // ← Capability-based
  },
  {
    title: 'Admin',
    href: '/admin',
    icon: Settings,
    requiredCapabilities: ['USER_VIEW']
  }
]

// Automatically filtered based on user capabilities
const items = getFilteredNavigation(userCapabilities)
```

### 4. Middleware (Route Protection)

```typescript
// src/middleware.ts
const protectedRoutes = [
  {
    path: '/admin',
    requiredCapabilities: ['USER_VIEW']
  },
  {
    path: '/documents/upload',
    requiredCapabilities: ['DOCUMENT_CREATE']
  }
]
```

---

## Migration from Role-Based to Capability-Based

### Before (Hardcoded Role Check ❌)

```typescript
// ❌ Bad: Hardcoded role name
if (user.role === 'admin' || user.role === 'manager') {
  // Show edit button
}

// ❌ Bad: Role hierarchy assumptions
const hasAccess = userLevel >= 70
```

### After (Capability-Based ✅)

```typescript
// ✅ Good: Capability check
if (hasCapability('DOCUMENT_EDIT')) {
  // Show edit button
}

// ✅ Good: Type-safe hook
const { canEditDocuments } = useCapabilities()
```

---

## Hook API Reference

### `useCapabilities()`

Returns an object with capability-based feature toggles.

**Returns:**
```typescript
{
  // Document capabilities
  canViewDocuments: boolean
  canEditDocuments: boolean
  canCreateDocuments: boolean
  canDeleteDocuments: boolean
  canDownloadDocuments: boolean
  canCommentDocuments: boolean
  canApproveDocuments: boolean
  canManageDocuments: boolean
  
  // User capabilities
  canViewUsers: boolean
  canManageUsers: boolean
  canDeleteUsers: boolean
  
  // Role capabilities
  canViewRoles: boolean
  canManageRoles: boolean
  
  // Combined capabilities
  isAdmin: boolean  // Has ADMIN_ACCESS + full permissions
  isManager: boolean  // Has DOCUMENT_MANAGE + USER_VIEW
  showAdminNav: boolean  // Has USER_VIEW or ROLE_VIEW
  hasAnyDocumentAccess: boolean  // Has any DOCUMENT_* capability
}
```

**Example:**
```typescript
const { 
  canEditDocuments,
  canManageUsers,
  isAdmin 
} = useCapabilities()

if (canEditDocuments) {
  // User can edit documents
}
```

---

## Helper Functions

### `requireCapability(request, capability)`

API route helper for single capability check.

```typescript
const auth = await requireCapability(request, 'DOCUMENT_EDIT')
if (!auth.authorized) {
  return NextResponse.json({ error: auth.error }, { status: auth.status })
}
```

### `requireAnyCapability(request, capabilities[])`

Require ANY of the specified capabilities.

```typescript
const auth = await requireAnyCapability(request, [
  'DOCUMENT_MANAGE',
  'USER_MANAGE'
])
```

### `requireAllCapabilities(request, capabilities[])`

Require ALL of the specified capabilities.

```typescript
const auth = await requireAllCapabilities(request, [
  'DOCUMENT_VIEW',
  'DOCUMENT_EDIT'
])
```

---

## TypeScript Types

```typescript
// Capability union type
export type Capability =
  | 'DOCUMENT_VIEW'
  | 'DOCUMENT_EDIT'
  | 'DOCUMENT_CREATE'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_COMMENT'
  | 'DOCUMENT_APPROVE'
  | 'DOCUMENT_MANAGE'
  | 'USER_VIEW'
  | 'USER_MANAGE'
  | 'USER_DELETE'
  | 'ROLE_VIEW'
  | 'ROLE_MANAGE'

// Extended session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      capabilities: string[]  // ← Capabilities array
    }
  }
}
```

---

## Database Schema

### `role_capabilities` Table

```sql
CREATE TABLE role_capabilities (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'DOCUMENT_VIEW'
  description TEXT,
  category VARCHAR(50),  -- 'document', 'user', 'role'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `role_capability_assignments` Table

```sql
CREATE TABLE role_capability_assignments (
  role_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, capability_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (capability_id) REFERENCES role_capabilities(id) ON DELETE CASCADE
);
```

---

## Performance

### Capability Loading

- **When:** At user login (NextAuth `jwt()` callback)
- **Frequency:** Every 60 seconds (token refresh)
- **Query Time:** ~2ms average (tested with 26 capabilities)
- **Storage:** JWT token (included in session)

### Capability Checks

- **In-Memory:** 0.0002ms per check (extremely fast)
- **No Database Query:** Capabilities already in session
- **Navigation Filtering:** O(n) complexity (single pass)

---

## Testing

### Unit Testing Capabilities

```typescript
import { render } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'

const mockSession = {
  user: {
    id: '1',
    email: 'test@example.com',
    capabilities: ['DOCUMENT_VIEW', 'DOCUMENT_EDIT']
  }
}

test('shows edit button with capability', () => {
  render(
    <SessionProvider session={mockSession}>
      <DocumentEditor />
    </SessionProvider>
  )
  
  expect(screen.getByText('Edit')).toBeInTheDocument()
})
```

---

## Best Practices

### ✅ DO

- Use capability checks for all authorization decisions
- Use TypeScript `Capability` type for type safety
- Check capabilities as early as possible (API route entry)
- Use `CapabilityGuard` for conditional rendering
- Load capabilities in session once, use everywhere

### ❌ DON'T

- Don't check role names directly (`user.role === 'admin'`)
- Don't use role hierarchy/level comparisons
- Don't duplicate capability checks
- Don't forget to validate on both client AND server
- Don't bypass capability checks for "convenience"

---

## Adding New Capabilities

### 1. Add to Database

```typescript
// prisma/seeds/capabilities.ts
await prisma.roleCapability.create({
  data: {
    name: 'REPORT_VIEW',
    description: 'View reports and analytics',
    category: 'report'
  }
})
```

### 2. Add to TypeScript Type

```typescript
// src/hooks/use-capabilities.tsx
export type Capability =
  | 'DOCUMENT_VIEW'
  | 'REPORT_VIEW'  // ← Add here
  // ... other capabilities
```

### 3. Add to Hook

```typescript
export function useCapabilities() {
  return useMemo(() => ({
    // ... existing capabilities
    canViewReports: capabilities.includes('REPORT_VIEW'),  // ← Add here
  }), [capabilities])
}
```

### 4. Assign to Roles

```typescript
// Admin UI or seed script
await prisma.roleCapabilityAssignment.create({
  data: {
    roleId: 'admin-role-id',
    capabilityId: 'report-view-capability-id'
  }
})
```

---

## Troubleshooting

### User doesn't see expected features

1. **Check capabilities in session:**
   ```typescript
   console.log('User capabilities:', session.user.capabilities)
   ```

2. **Verify role has capability:**
   ```sql
   SELECT rc.name
   FROM role_capability_assignments rca
   JOIN role_capabilities rc ON rc.id = rca.capability_id
   WHERE rca.role_id = 'user-role-id';
   ```

3. **Refresh session:**
   - User may need to logout/login
   - Or wait for JWT refresh (60 seconds)

### API returns 403 Forbidden

1. **Check if user is authenticated:**
   ```typescript
   const session = await getServerSession(authOptions)
   console.log('Session:', session)
   ```

2. **Verify capability check:**
   ```typescript
   const auth = await requireCapability(request, 'CORRECT_CAPABILITY')
   console.log('Auth result:', auth)
   ```

### Navigation items not showing

1. **Check navigation configuration:**
   ```typescript
   // Ensure requiredCapabilities array is correct
   requiredCapabilities: ['DOCUMENT_VIEW']  // not 'documents.view'
   ```

2. **Verify user has capability:**
   ```typescript
   const { canViewDocuments } = useCapabilities()
   console.log('Can view documents:', canViewDocuments)
   ```

---

## Resources

- [Phase 4 Testing Results](PHASE_4_TESTING_RESULTS.md) - Test coverage and results
- [Migration Progress](MIGRATION_PROGRESS.md) - Migration status
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment steps

---

**Questions or Issues?** Check the [PHASE_4_TESTING_RESULTS.md](PHASE_4_TESTING_RESULTS.md) for detailed testing documentation.
