# Unified RBAC Quick Reference Guide

## 🚀 Quick Start

### Check if user has a capability
```typescript
import { UnifiedAccessControl } from '@/lib/unified-access-control'

const hasAccess = await UnifiedAccessControl.hasCapability(userId, 'ADMIN_ACCESS')
```

### Get user's navigation
```typescript
const navigation = await UnifiedAccessControl.getNavigationForUser(userId)
```

### Protect an API route
```typescript
import { withAPIProtection } from '@/lib/api-protection'

export const GET = withAPIProtection('/api/users', 'GET', async (req, session) => {
  // Your handler logic here
  return NextResponse.json({ data: 'authorized' })
})
```

## 📋 Available Capabilities

### System
- `ADMIN_ACCESS` - Access to admin areas
- `SYSTEM_CONFIG` - System configuration management

### User Management
- `USER_MANAGE` - Create, update, delete users
- `USER_VIEW` - View user information
- `ROLE_MANAGE` - Manage roles
- `PERMISSION_MANAGE` - Manage permissions

### Documents
- `DOCUMENT_FULL_ACCESS` - Complete document access
- `DOCUMENT_VIEW` - View documents
- `DOCUMENT_CREATE` - Create new documents
- `DOCUMENT_EDIT` - Edit documents
- `DOCUMENT_DELETE` - Delete documents
- `DOCUMENT_APPROVE` - Approve documents
- `DOCUMENT_PUBLISH` - Publish documents

### Organization
- `ORGANIZATION_MANAGE` - Manage organizational units
- `ORGANIZATION_VIEW` - View organizational units

### Analytics
- `ANALYTICS_VIEW` - View analytics and reports
- `ANALYTICS_EXPORT` - Export analytics data

### Audit
- `AUDIT_VIEW` - View audit logs

### Workflow
- `WORKFLOW_MANAGE` - Manage workflow configurations

## 🔑 Role Capabilities Matrix

| Capability | admin | ppd.pusat | ppd.unit | manager | editor | viewer | guest |
|------------|-------|-----------|----------|---------|--------|--------|-------|
| ADMIN_ACCESS | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| SYSTEM_CONFIG | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| USER_MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| USER_VIEW | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ROLE_MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| PERMISSION_MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DOCUMENT_FULL_ACCESS | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DOCUMENT_VIEW | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DOCUMENT_CREATE | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| DOCUMENT_EDIT | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| DOCUMENT_DELETE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| DOCUMENT_APPROVE | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| DOCUMENT_PUBLISH | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| ORGANIZATION_MANAGE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ORGANIZATION_VIEW | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ANALYTICS_VIEW | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| ANALYTICS_EXPORT | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AUDIT_VIEW | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| WORKFLOW_MANAGE | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 📝 Common Patterns

### Pattern 1: Protect API Route with Specific Capability
```typescript
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { UnifiedAccessControl } from '@/lib/unified-access-control'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check capability
  const hasAccess = await UnifiedAccessControl.hasCapability(
    session.user.id, 
    'USER_MANAGE'
  )
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed with handler
  return NextResponse.json({ success: true })
}
```

### Pattern 2: Conditional UI Rendering
```typescript
// In a React component
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export function AdminPanel() {
  const { data: session } = useSession()
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const res = await fetch('/api/check-capability?capability=ADMIN_ACCESS')
      const data = await res.json()
      setHasAccess(data.hasAccess)
    }
    checkAccess()
  }, [])

  if (!hasAccess) return null

  return <div>Admin content here</div>
}
```

### Pattern 3: Get All User Capabilities
```typescript
// src/app/api/me/capabilities/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth'
import { getUserCapabilities } from '@/lib/unified-access-control'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const capabilities = await getUserCapabilities(session.user.id)
  return NextResponse.json({ capabilities })
}
```

## 🗄️ Database Management

### Add a new capability
```typescript
// Run this in prisma studio or via seed script
await prisma.roleCapability.create({
  data: {
    name: 'REPORTS_GENERATE',
    description: 'Generate custom reports',
    category: 'analytics'
  }
})
```

### Add a new navigation item
```typescript
await prisma.resource.create({
  data: {
    id: 'nav-reports',
    type: 'navigation',
    path: '/reports',
    name: 'Reports',
    description: 'Custom reports',
    requiredCapability: 'REPORTS_GENERATE',
    icon: 'FileBarChart',
    sortOrder: 4,
    isActive: true
  }
})
```

### Assign capability to role
```typescript
const role = await prisma.role.findUnique({ where: { name: 'ppd.unit' } })
const capability = await prisma.roleCapability.findUnique({ 
  where: { name: 'REPORTS_GENERATE' } 
})

await prisma.roleCapabilityAssignment.create({
  data: {
    roleId: role.id,
    capabilityId: capability.id
  }
})
```

### Clear cache after changes
```typescript
import { UnifiedAccessControl } from '@/lib/unified-access-control'

// Clear specific user
UnifiedAccessControl.clearUserCache(userId)

// Clear all cache
UnifiedAccessControl.clearAllCache()
```

## 🧪 Testing

### Run the test suite
```bash
npx tsx scripts/test-unified-rbac.ts
```

### Test specific user capabilities
```bash
# In node or tsx REPL
import { PrismaClient } from '@prisma/client'
import { UnifiedAccessControl } from './src/lib/unified-access-control'

const prisma = new PrismaClient()
const user = await prisma.user.findUnique({ where: { email: 'tik@dsm.com' } })
const caps = await UnifiedAccessControl.getUserCapabilities(user.id)
console.log(caps)
```

## 🔍 Debugging

### Check what navigation a user sees
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { getNavigationForUser } from './src/lib/unified-access-control';
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: 'tik@dsm.com' } });
const nav = await getNavigationForUser(user.id);
console.log(JSON.stringify(nav, null, 2));
"
```

### Verify role capabilities
```sql
-- In database
SELECT 
  r.name as role_name,
  rc.name as capability_name,
  rc.category
FROM roles r
JOIN role_capability_assignments rca ON rca.role_id = r.id
JOIN role_capabilities rc ON rc.id = rca.capability_id
WHERE r.name = 'ppd.unit'
ORDER BY rc.category, rc.name;
```

## 📚 Additional Resources

- [Full Documentation](./UNIFIED_RBAC_SYSTEM.md)
- [Implementation Summary](./UNIFIED_RBAC_IMPLEMENTATION_SUMMARY.md)
- [Resources Table Examples](./UNIFIED_RBAC_RESOURCES_EXAMPLES.md)

## 🆘 Troubleshooting

### Issue: User not seeing navigation items
1. Check user has required capability: `getUserCapabilities(userId)`
2. Verify resource has correct `requiredCapability`
3. Clear cache: `UnifiedAccessControl.clearUserCache(userId)`
4. Check resource `isActive = true`

### Issue: API always returns 403
1. Verify API resource exists in database
2. Check resource path and method match exactly
3. Verify user has required capability
4. Check authOptions is correctly imported

### Issue: Navigation shows but route access denied
1. Create matching route resource for navigation item
2. Ensure route resource has same `requiredCapability`
3. Update middleware if still using hardcoded routes

## 💡 Pro Tips

1. **Performance**: Cache is automatic with 5-min TTL. Don't fetch capabilities on every request.
2. **Flexibility**: Use metadata field in resources for custom data (e.g., feature flags)
3. **Hierarchy**: Parent navigation items without requiredCapability are visible to all
4. **Testing**: Always test with lowest privilege role first
5. **Audit**: All capability checks can be logged for compliance
