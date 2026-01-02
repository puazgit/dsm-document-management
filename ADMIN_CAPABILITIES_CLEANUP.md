# Admin Capabilities Page Cleanup

## Summary
Removed duplicate `/admin/capabilities` page in favor of the more comprehensive `/admin/rbac/assignments` interface.

## Rationale
The `/admin/rbac/assignments` page provides superior functionality:
- ✅ Matrix view showing all roles and capabilities
- ✅ Create, edit, and delete capabilities
- ✅ Manage role-capability assignments
- ✅ Better UX with visual relationship display

The old `/admin/capabilities` page was redundant and provided less functionality.

## Changes Made

### 1. Deleted Page Files
- ❌ Removed: `src/app/admin/capabilities/` directory

### 2. Updated Database Resources
- ❌ Removed navigation resource: `nav-admin-capabilities`
- ❌ Removed route resource: `route-admin-capabilities`
- ✅ Updated count: 50 resources (down from 52)

### 3. Updated Seeds File
**File:** `prisma/seeds/resources.ts`
- Removed `nav-admin-capabilities` entry
- Removed `route-admin-capabilities` entry
- Updated sort order for remaining admin menu items

### 4. Updated Admin Dashboard
**File:** `src/app/admin/page.tsx`
- Changed link from `/admin/capabilities` → `/admin/rbac/assignments`
- Updated description to "Manage role capabilities with matrix view"

### 5. Removed Backup Files
- ❌ Removed: `src/app/admin/roles/page.tsx.backup`

## What Was Preserved

### API Endpoints (Still Active)
The following API endpoints are **still active** and used by other pages:
- `GET /api/admin/capabilities` - List all capabilities
- `POST /api/admin/capabilities` - Create new capability
- `PATCH /api/admin/capabilities` - Update capability
- `DELETE /api/admin/capabilities` - Delete capability

**Used by:**
- `/admin/roles` - Fetches capabilities for role management
- `/admin/rbac/assignments` - Full CRUD operations
- `/admin/rbac/resources` - Displays capability requirements

## Navigation Structure (After Cleanup)

```
Admin (nav-admin)
├── User Management (/admin/users)
├── Role Management (/admin/roles)
├── RBAC Resources (/admin/rbac/resources)
├── RBAC Assignments (/admin/rbac/assignments) ← Capabilities managed here
├── Organizations (/admin/organizations)
└── Audit Logs (/admin/audit)
```

## Resource Counts

### Before Cleanup
- Total: 52 resources
- Navigation: 13
- Routes: 14
- APIs: 25

### After Cleanup
- Total: 50 resources
- Navigation: 12
- Routes: 13
- APIs: 25

## Testing Checklist

- [ ] Visit `/admin/rbac/assignments` - should load successfully
- [ ] Visit `/admin/capabilities` - should show 404
- [ ] Admin dashboard card "Capabilities" - should link to `/admin/rbac/assignments`
- [ ] Admin sidebar - should not show "Capabilities" menu item
- [ ] Create/edit/delete capabilities - should work via assignments page
- [ ] Role management page - should still fetch capabilities successfully

## Verification

```bash
# Check no references to /admin/capabilities page (excluding API endpoints)
grep -r "/admin/capabilities[^/]" src/ | grep -v "\.backup" | grep -v "/api/"

# Expected results: Only API endpoint references in:
# - src/app/admin/roles/page.tsx
# - src/app/admin/rbac/assignments/page.tsx
# - src/app/admin/rbac/resources/page.tsx
```

## Migration Notes

- Navigation cache will refresh automatically (5-minute TTL)
- No database migration needed (only resource entries updated)
- No breaking changes for existing users
- API endpoints remain unchanged for backward compatibility

## Completion Date
January 2, 2025
