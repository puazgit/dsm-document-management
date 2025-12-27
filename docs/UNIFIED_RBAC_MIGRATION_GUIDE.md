# Migration Guide: Old Navigation to Unified RBAC

## Overview

This guide helps you transition from the old hardcoded navigation system to the new unified RBAC system.

## What Changed

### Before (Old System)
```typescript
// src/lib/navigation.ts - Hardcoded role checks
export const navigationItems = [
  {
    title: 'Admin',
    href: '/admin',
    icon: Settings,
    requiredRoles: ['admin', 'ppd.pusat', 'ppd.unit'], // Hardcoded!
    children: [...]
  }
]
```

### After (New System)
```sql
-- Database table: resources
| id       | type       | path   | name  | required_capability |
|----------|------------|--------|-------|-------------------|
| nav-admin| navigation | /admin | Admin | ADMIN_ACCESS      |
```

## Migration Steps

### Step 1: Switch to Unified Sidebar ✅ DONE

The application is already using the unified sidebar:
- `src/components/ui/dashboard-layout.tsx` now uses `AppSidebarUnified`
- Navigation is fetched from `/api/navigation`
- Icons are dynamically loaded from database

### Step 2: Verify Database Data ✅ DONE

All required data is seeded:
- ✅ 47 resources (navigation, routes, APIs)
- ✅ 19 capabilities
- ✅ Role-capability assignments for all 7 roles

### Step 3: Test User Access ✅ DONE

Verified that users see correct navigation:
- ✅ Admin sees all menus
- ✅ PPD Unit sees Admin menu (with ADMIN_ACCESS)
- ✅ Viewer sees limited menus

### Step 4: Optional - Remove Old Files

The old navigation system is still present but not used. You can safely remove these files when ready:

```bash
# Optional cleanup (not required)
# rm src/lib/navigation.ts  # Old hardcoded navigation
# rm src/components/app-sidebar.tsx  # Old sidebar component
```

**Note**: Keep these files for now as reference or backup. They don't interfere with the new system.

## Coexistence Mode

Both systems can coexist:
- **Old**: `src/lib/navigation.ts` + `AppSidebar` (not used)
- **New**: Database resources + `AppSidebarUnified` (active)

The new system is active by default via `dashboard-layout.tsx`.

## Adding New Navigation Items

### Old Way (Don't Use)
```typescript
// Edit src/lib/navigation.ts
{
  title: 'Reports',
  href: '/reports',
  icon: FileBarChart,
  requiredRoles: ['admin', 'ppd.pusat'], // Hardcoded
}
```

### New Way (Use This)
```typescript
// Run seed script or add via API
await prisma.resource.create({
  data: {
    id: 'nav-reports',
    type: 'navigation',
    path: '/reports',
    name: 'Reports',
    requiredCapability: 'ANALYTICS_VIEW',
    icon: 'FileBarChart',
    sortOrder: 5,
  }
})
```

Or via Prisma Studio:
1. Open `npx prisma studio`
2. Go to `resources` table
3. Click "Add record"
4. Fill in the form
5. Save

## Adding New Capabilities

```typescript
// 1. Create capability
await prisma.roleCapability.create({
  data: {
    name: 'REPORTS_ADVANCED',
    description: 'Access advanced reports',
    category: 'analytics'
  }
})

// 2. Assign to roles
const role = await prisma.role.findUnique({ where: { name: 'admin' } })
const cap = await prisma.roleCapability.findUnique({ 
  where: { name: 'REPORTS_ADVANCED' } 
})

await prisma.roleCapabilityAssignment.create({
  data: {
    roleId: role.id,
    capabilityId: cap.id
  }
})

// 3. Clear cache
import { UnifiedAccessControl } from '@/lib/unified-access-control'
UnifiedAccessControl.clearAllCache()
```

## Middleware Migration (Optional)

The middleware still uses hardcoded routes. To migrate:

### Current (Working)
```typescript
// src/middleware.ts
const protectedRoutes: Record<string, string[]> = {
  '/admin': ['admin', 'ppd.pusat', 'ppd.unit'],
  // ... hardcoded
}
```

### Future (Recommended)
```typescript
// src/middleware.ts - Can be migrated later
import { canAccessRoute } from '@/lib/unified-access-control'

// In middleware
const hasAccess = await canAccessRoute(userId, pathname)
```

**Note**: This requires Edge Runtime support for Prisma, which has limitations. The current middleware works fine and can be migrated incrementally.

## API Route Migration

### Old Way
```typescript
// Hardcoded role checks
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session.user.role !== 'admin') { // Hardcoded!
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ...
}
```

### New Way
```typescript
import { withAPIProtection } from '@/lib/api-protection'

export const POST = withAPIProtection('/api/users', 'POST', async (req, session) => {
  // Automatically checks USER_MANAGE capability
  // ...
})
```

## Rollback Plan

If you need to rollback to the old system:

1. Edit `src/components/ui/dashboard-layout.tsx`:
```typescript
// Change this:
import { AppSidebarUnified } from "../app-sidebar-unified"
// To this:
import { AppSidebar } from "../app-sidebar"

// And change component:
<AppSidebar />
```

2. The old system will work immediately (old files are still present)

## Best Practices

### ✅ Do
- Use database for all new navigation items
- Assign capabilities based on user functions, not roles
- Clear cache after database changes
- Test with lowest privilege role first
- Use capability names that describe actions (VERB_NOUN)

### ❌ Don't
- Don't hardcode role names in components
- Don't bypass the unified system
- Don't forget to clear cache after changes
- Don't create overly granular capabilities (start broad)

## Testing Checklist

After making changes:

- [ ] Run test script: `npx tsx scripts/test-unified-rbac.ts`
- [ ] Log in as each role and verify navigation
- [ ] Test protected routes work correctly
- [ ] Verify API endpoints respect capabilities
- [ ] Clear browser cache and test again

## Monitoring

Check these metrics to ensure smooth transition:

```sql
-- Active resources count
SELECT type, COUNT(*) 
FROM resources 
WHERE is_active = true 
GROUP BY type;

-- Capabilities per role
SELECT r.name, COUNT(rca.capability_id) as cap_count
FROM roles r
LEFT JOIN role_capability_assignments rca ON r.id = rca.role_id
GROUP BY r.name;

-- Users without capabilities (should be none)
SELECT u.email, u.name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.role_id IS NULL;
```

## Support

If you encounter issues:

1. Check [Quick Reference Guide](./UNIFIED_RBAC_QUICK_REFERENCE.md)
2. Review [Implementation Summary](./UNIFIED_RBAC_IMPLEMENTATION_SUMMARY.md)
3. Run test script: `npx tsx scripts/test-unified-rbac.ts`
4. Check database: `npx prisma studio`
5. Clear all caches: `UnifiedAccessControl.clearAllCache()`

## Success Criteria

Migration is successful when:
- ✅ All users can log in and see appropriate navigation
- ✅ Protected routes only accessible to authorized users
- ✅ API endpoints respect capability-based access
- ✅ No hardcoded role checks in new code
- ✅ Cache performance is adequate (< 100ms navigation load)

## Timeline

- **Completed**: Database setup, core service, sidebar integration, API protection helpers
- **Current**: System is live and working
- **Next**: Build admin UI for managing resources (optional)
- **Future**: Migrate middleware to database-driven (optional)

---

**Status**: ✅ **Migration Complete** - New system is active and working
