# Admin RBAC UI - Complete Guide

## Overview

Admin RBAC UI adalah antarmuka web untuk mengelola sistem Unified Role-Based Access Control (RBAC). Sistem ini memungkinkan administrator untuk:

1. **Mengelola Resources** - Navigation items, routes, dan API endpoints
2. **Assign Capabilities ke Roles** - Interactive matrix untuk capability assignments

## Architecture

### Database Tables

```
role_capabilities (21 records)
├── id: Unique identifier (e.g., 'DOCUMENT_MANAGE')
├── name: Human-readable name
├── description: Purpose description
└── category: Grouping (system, user, document, etc.)

resources (58 records)
├── id: Unique identifier
├── type: 'navigation' | 'route' | 'api'
├── path: URL/endpoint path
├── name: Display name
├── requiredCapability: Capability required to access
├── parentId: For hierarchical navigation
├── sortOrder: Display order
└── metadata: JSON field for additional data

role_capability_assignments (63 records)
├── roleId: Role reference
├── capabilityId: Capability reference
└── assignedAt: Timestamp
```

### API Endpoints

#### Capabilities Management
- `GET /api/admin/capabilities` - List all capabilities with assignments
- `POST /api/admin/capabilities` - Create new capability
- `PUT /api/admin/capabilities/[id]` - Update capability
- `DELETE /api/admin/capabilities/[id]` - Delete capability

**Required Capability:** `PERMISSION_MANAGE`

#### Resources Management
- `GET /api/admin/resources` - List all resources (supports ?type filter)
- `POST /api/admin/resources` - Create new resource
- `PUT /api/admin/resources/[id]` - Update resource
- `DELETE /api/admin/resources/[id]` - Delete resource

**Required Capability:** `PERMISSION_MANAGE`

#### Role-Capability Assignments
- `GET /api/admin/role-capabilities` - Get roles with their capabilities
- `POST /api/admin/role-capabilities` - Assign/unassign capability to role

**Required Capability:** `ROLE_MANAGE`

## UI Pages

### 1. Resources Management (`/admin/rbac/resources`)

**Purpose:** Manage all system resources (navigation, routes, APIs)

**Features:**
- **Tabs View**
  - All Resources
  - Navigation Items (15)
  - Routes (14)
  - APIs (29)

- **CRUD Operations**
  - Create new resource with comprehensive form
  - Edit existing resource
  - Delete resource (with confirmation)

- **Form Fields:**
  - **ID**: Unique identifier (e.g., 'nav-dashboard')
  - **Type**: Navigation, Route, or API
  - **Path**: URL or endpoint path
  - **Name**: Display name
  - **Description**: Purpose description
  - **Parent**: For hierarchical navigation
  - **Required Capability**: Capability needed to access
  - **Icon**: Lucide icon name (for navigation)
  - **Sort Order**: Display order
  - **Active**: Enable/disable resource
  - **Metadata**: JSON editor for additional data

- **Table Columns:**
  - ID with type badge
  - Path
  - Name
  - Parent (if applicable)
  - Required Capability badge
  - Active status
  - Actions (Edit, Delete)

**Access:** Users with `PERMISSION_MANAGE` capability

### 2. Role-Capability Assignments (`/admin/rbac/assignments`)

**Purpose:** Manage which capabilities each role has

**Features:**
- **Interactive Matrix**
  - Rows: Capabilities grouped by category
  - Columns: Roles (guest → admin)
  - Cells: Checkboxes for assign/unassign

- **Capability Categories:**
  - System (3 capabilities)
  - User (4 capabilities)
  - Document (8 capabilities)
  - Organization (2 capabilities)
  - Analytics (2 capabilities)
  - Audit (1 capability)
  - Workflow (1 capability)

- **Role Summary Cards**
  - Role name and level
  - Total capabilities assigned
  - Quick overview

- **Real-time Updates**
  - Click checkbox to toggle assignment
  - Automatic page refresh after change
  - Loading states during API calls

**Access:** Users with `ROLE_MANAGE` capability

## Current System State

### Capabilities (21 total)

#### System (3)
- `ADMIN_ACCESS` - Access to admin area
- `SYSTEM_CONFIG` - Configure system settings
- `SYSTEM_CONFIGURE` - Advanced system configuration

#### User (4)
- `USER_VIEW` - View user information
- `USER_MANAGE` - Create/edit/delete users
- `ROLE_MANAGE` - Manage roles
- `PERMISSION_MANAGE` - Manage permissions

#### Document (8)
- `DOCUMENT_VIEW` - View documents
- `DOCUMENT_CREATE` - Create documents
- `DOCUMENT_EDIT` - Edit documents
- `DOCUMENT_DELETE` - Delete documents
- `DOCUMENT_APPROVE` - Approve documents
- `DOCUMENT_PUBLISH` - Publish documents
- `DOCUMENT_FULL_ACCESS` - Full document access
- `DOCUMENT_MANAGE` - Manage documents

#### Organization (2)
- `ORGANIZATION_VIEW` - View organizations
- `ORGANIZATION_MANAGE` - Manage organizations

#### Analytics (2)
- `ANALYTICS_VIEW` - View analytics
- `ANALYTICS_EXPORT` - Export analytics data

#### Audit (1)
- `AUDIT_VIEW` - View audit logs

#### Workflow (1)
- `WORKFLOW_MANAGE` - Manage workflows

### Resources (58 total)

- **Navigation**: 15 items
- **Routes**: 14 items
- **APIs**: 29 endpoints

### Roles (7 total)

1. **guest** (Level 10) - 1 capability
   - DOCUMENT_VIEW

2. **viewer** (Level 30) - 1 capability
   - DOCUMENT_VIEW

3. **editor** (Level 70) - 6 capabilities
   - DOCUMENT_FULL_ACCESS, DOCUMENT_MANAGE, DOCUMENT_VIEW, DOCUMENT_CREATE, DOCUMENT_EDIT
   - ANALYTICS_VIEW

4. **ppd.unit** (Level 70) - 7 capabilities
   - ADMIN_ACCESS
   - USER_VIEW
   - DOCUMENT_VIEW, DOCUMENT_CREATE, DOCUMENT_EDIT
   - ORGANIZATION_VIEW
   - ANALYTICS_VIEW

5. **manager** (Level 80) - 10 capabilities
   - DOCUMENT_MANAGE, DOCUMENT_VIEW, DOCUMENT_CREATE, DOCUMENT_EDIT, DOCUMENT_APPROVE, DOCUMENT_PUBLISH
   - USER_VIEW, USER_MANAGE
   - ORGANIZATION_VIEW
   - ANALYTICS_VIEW

6. **ppd.pusat** (Level 100) - 17 capabilities
   - ADMIN_ACCESS
   - USER_VIEW, USER_MANAGE, ROLE_MANAGE, PERMISSION_MANAGE
   - DOCUMENT_FULL_ACCESS, DOCUMENT_VIEW, DOCUMENT_CREATE, DOCUMENT_EDIT, DOCUMENT_DELETE, DOCUMENT_APPROVE, DOCUMENT_PUBLISH
   - ORGANIZATION_VIEW, ORGANIZATION_MANAGE
   - ANALYTICS_VIEW, ANALYTICS_EXPORT
   - AUDIT_VIEW

7. **admin** (Level 100) - 21 capabilities (ALL)
   - All system capabilities

## Usage Guide

### Accessing Admin RBAC UI

1. **Login** as user with admin role (level 100 or superadmin level 0)
2. **Navigate** to sidebar → Admin menu
3. **Click** "RBAC Management" submenu
4. **Choose** between:
   - Resources - Manage navigation/routes/APIs
   - Role Assignments - Manage capability assignments

### Managing Resources

#### Create New Resource

1. Click "Create Resource" button
2. Fill in the form:
   ```
   ID: nav-new-page
   Type: Navigation
   Path: /new-page
   Name: New Page
   Description: A new page in the system
   Parent: nav-admin (optional)
   Required Capability: ADMIN_ACCESS
   Icon: file (Lucide icon name)
   Sort Order: 10
   Active: true
   Metadata: {} (JSON)
   ```
3. Click "Create"
4. Resource will appear in table

#### Edit Resource

1. Click "Edit" button on resource row
2. Modify fields as needed
3. Click "Update"
4. Changes are applied immediately

#### Delete Resource

1. Click "Delete" button on resource row
2. Confirm deletion
3. Resource removed from database

#### Filter Resources

Use tabs to filter by type:
- **All** - Show all 58 resources
- **Navigation** - Show 15 navigation items
- **Routes** - Show 14 route definitions
- **APIs** - Show 29 API endpoints

### Managing Role-Capability Assignments

#### Assign Capability to Role

1. Find capability row (e.g., "USER_MANAGE")
2. Find role column (e.g., "manager")
3. Click checkbox in intersection cell
4. Wait for success message
5. Page refreshes with updated data

#### Unassign Capability from Role

1. Find assigned capability (checkbox is checked)
2. Click checkbox to uncheck
3. Wait for success message
4. Page refreshes with updated data

#### View Role Summary

Look at role summary cards to see:
- Role name and level
- Total capabilities assigned
- Quick overview of role permissions

### Best Practices

1. **Test Changes**
   - After modifying resources, test navigation
   - After changing assignments, test with affected role

2. **Use Descriptive Names**
   - Resource IDs: Use prefix like 'nav-', 'route-', 'api-'
   - Names: Clear, human-readable

3. **Set Appropriate Capabilities**
   - Public pages: Leave requiredCapability null
   - Admin pages: Use ADMIN_ACCESS or specific capability
   - APIs: Match with frontend page capability

4. **Organize Navigation**
   - Use parentId for hierarchical menus
   - Set sortOrder for proper ordering
   - Keep related items together

5. **Document Changes**
   - Use description field
   - Use metadata for additional context

## Testing

### Run Test Suite

```bash
npx tsx scripts/test-admin-rbac-ui.ts
```

**Test Coverage:**
- ✅ Navigation resources (3 items)
- ✅ Route resources (2 items)
- ✅ API resources (6 endpoints)
- ✅ User access verification
- ✅ Capabilities table (21 capabilities)
- ✅ Resources table (58 resources)
- ✅ Role assignments (63 assignments)
- ✅ Database statistics

### Manual Testing

1. **Login as admin**
   - Should see "RBAC Management" in Admin menu

2. **Test Resources Page**
   - Navigate to /admin/rbac/resources
   - Create test resource
   - Edit test resource
   - Delete test resource
   - Try filtering by type

3. **Test Role Assignments Page**
   - Navigate to /admin/rbac/assignments
   - Assign capability to role
   - Unassign capability from role
   - Verify matrix updates

4. **Test Permissions**
   - Login as ppd.unit (should NOT see RBAC Management)
   - Login as ppd.pusat (should see RBAC Management)
   - Verify API endpoints require correct capabilities

## Technical Details

### Cache Management

All API endpoints that modify data call:
```typescript
UnifiedAccessControl.clearAllCache()
```

This ensures:
- Navigation updates immediately
- Permission checks use latest data
- No stale data in LRU cache

### Security

1. **Authentication**
   - All endpoints require valid session
   - Uses NextAuth JWT tokens

2. **Authorization**
   - Capability-based checks via UnifiedAccessControl
   - `PERMISSION_MANAGE` for resources/capabilities
   - `ROLE_MANAGE` for assignments

3. **Validation**
   - Required fields validated
   - Type checking for resource types
   - JSON validation for metadata

### Components Used

- **shadcn/ui components:**
  - Card, Table, Dialog
  - Input, Select, Textarea
  - Switch, Badge, Tabs
  - Button, Separator

- **Icons:** Lucide React

- **Styling:** Tailwind CSS

## Troubleshooting

### "No admin user found" in tests
- Check if any user has role with level 0 (superadmin)
- Verify UserRole records are active
- Run: `npx tsx prisma/seed.ts` to recreate users

### Navigation not updating
- Check if cache is cleared after resource changes
- Restart dev server
- Check browser console for errors

### Permission denied on page access
- Verify user has required capability
- Check role_capability_assignments table
- Run test script to verify assignments

### Resource not appearing in table
- Check if resource.isActive is true
- Verify type matches filter tab
- Check database directly: `SELECT * FROM resources WHERE id='...'`

### Matrix checkbox not working
- Check browser console for API errors
- Verify ROLE_MANAGE capability
- Check network tab for failed requests

## Files Structure

```
src/
├── app/
│   ├── admin/
│   │   └── rbac/
│   │       ├── resources/
│   │       │   └── page.tsx          # Resources management UI (413 lines)
│   │       └── assignments/
│   │           └── page.tsx          # Role assignments UI (358 lines)
│   └── api/
│       └── admin/
│           ├── capabilities/
│           │   ├── route.ts          # List/Create capabilities
│           │   └── [id]/
│           │       └── route.ts      # Update/Delete capability
│           ├── resources/
│           │   ├── route.ts          # List/Create resources
│           │   └── [id]/
│           │       └── route.ts      # Update/Delete resource
│           └── role-capabilities/
│               └── route.ts          # Manage assignments

prisma/
├── seeds/
│   └── add-rbac-nav.ts              # Add navigation items (11 resources)

scripts/
└── test-admin-rbac-ui.ts            # Comprehensive test suite

docs/
└── ADMIN_RBAC_UI_GUIDE.md          # This file
```

## Migration Guide

### From Hardcoded to Database-Driven

**Before:**
```typescript
// Hardcoded in code
if (user.role === 'admin') {
  return <AdminMenu />
}
```

**After:**
```typescript
// Database-driven via UnifiedAccessControl
const hasAccess = await UnifiedAccessControl.hasCapability(
  userId,
  'ADMIN_ACCESS'
)
if (hasAccess) {
  return <AdminMenu />
}
```

### Adding New Pages

1. **Add Route Resource**
   ```typescript
   {
     id: 'route-new-page',
     type: 'route',
     path: '/new-page',
     name: 'New Page Route',
     requiredCapability: 'NEW_PAGE_ACCESS',
   }
   ```

2. **Add Navigation Resource**
   ```typescript
   {
     id: 'nav-new-page',
     type: 'navigation',
     path: '/new-page',
     name: 'New Page',
     parentId: 'nav-admin',
     requiredCapability: 'NEW_PAGE_ACCESS',
     sortOrder: 20,
   }
   ```

3. **Create Capability (if new)**
   ```typescript
   {
     id: 'NEW_PAGE_ACCESS',
     name: 'New Page Access',
     category: 'system',
     description: 'Access to new page',
   }
   ```

4. **Assign to Roles**
   - Use Admin RBAC UI → Role Assignments
   - Check boxes for roles that should have access

## Future Enhancements

### Planned Features

1. **Bulk Operations**
   - Assign multiple capabilities at once
   - Create multiple resources from CSV

2. **History/Audit**
   - Track who modified what
   - Rollback capability

3. **Import/Export**
   - Export resources as JSON
   - Import resources from file

4. **Search & Filter**
   - Search resources by name/path
   - Filter by capability

5. **Validation Rules**
   - Prevent deletion of system resources
   - Warn about breaking changes

6. **Testing Tools**
   - Test access as different users
   - Simulate permission scenarios

### API Additions

- `POST /api/admin/resources/bulk` - Bulk create
- `GET /api/admin/audit/rbac` - RBAC change history
- `POST /api/admin/resources/export` - Export to JSON
- `POST /api/admin/resources/import` - Import from JSON

## Support

### Common Commands

```bash
# Run tests
npx tsx scripts/test-admin-rbac-ui.ts

# Add RBAC navigation
npx tsx prisma/seeds/add-rbac-nav.ts

# Re-seed database
npx tsx prisma/seed.ts

# Check database
psql $DATABASE_URL
\dt  # List tables
SELECT * FROM resources WHERE type='navigation';
SELECT * FROM role_capability_assignments;
```

### Useful Queries

```sql
-- List all capabilities by role
SELECT r.name, COUNT(rca.capability_id) as cap_count
FROM roles r
LEFT JOIN role_capability_assignments rca ON r.id = rca.role_id
GROUP BY r.name
ORDER BY cap_count DESC;

-- Find resources without required capability (public)
SELECT id, type, path, name
FROM resources
WHERE required_capability IS NULL;

-- List navigation hierarchy
SELECT 
  parent.name as parent_name,
  child.name as child_name,
  child.path,
  child.sort_order
FROM resources child
LEFT JOIN resources parent ON child.parent_id = parent.id
WHERE child.type = 'navigation'
ORDER BY parent.sort_order, child.sort_order;
```

## Conclusion

Admin RBAC UI menyediakan interface yang user-friendly untuk mengelola sistem permission yang kompleks. Dengan UI ini, administrator dapat:

- ✅ Manage resources tanpa edit kode
- ✅ Assign capabilities dengan mudah
- ✅ Test perubahan secara real-time
- ✅ Dokumentasi terpusat di database
- ✅ Audit trail untuk perubahan

**Status:** ✅ Production Ready

**Version:** 1.0.0

**Last Updated:** 2024

---

**Navigation:** [Home](../README.md) | [Unified RBAC](./UNIFIED_RBAC_IMPLEMENTATION.md)
