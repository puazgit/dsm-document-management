# Permission Usage Audit Report

**Date:** 2026-01-02  
**Phase:** 1.2 - Audit Permission Usage  
**Total Locations:** 97

---

## Executive Summary

This report identifies all locations in the codebase that use the legacy Permission system and need migration to the Capability-based system.

### Statistics
- **Session Property Usage:** 12 locations
- **Permission Checks:** 12 locations
- **Prisma Queries:** 62 locations
- **Unique Files:** 25

---

## Files by Priority (Most Changes)

- **10 usages** - `app/api/permissions/[id]/route.ts`
- **9 usages** - `app/admin/permissions/page.tsx`
- **7 usages** - `app/admin/roles/page.tsx`
- **7 usages** - `lib/permissions.ts`
- **7 usages** - `app/api/roles/[id]/permissions/route.ts`
- **6 usages** - `app/api/roles/[id]/route.ts`
- **5 usages** - `app/api/groups/[id]/permissions/route.ts`
- **5 usages** - `app/api/permissions/route.ts`
- **5 usages** - `app/api/roles/route.ts`
- **5 usages** - `app/admin/pdf-permissions/page.tsx`
- **4 usages** - `components/admin/permission-matrix.tsx`
- **3 usages** - `app/api/debug-permissions/route.ts`
- **3 usages** - `lib/next-auth.ts`
- **3 usages** - `components/documents/enhanced-pdf-viewer.tsx`
- **3 usages** - `components/documents/documents-list.tsx`
- **3 usages** - `app/api/roles/[id]/permissions-summary/route.ts`
- **2 usages** - `app/api/documents/[id]/status/route.ts`
- **2 usages** - `app/api/documents/[id]/version/[version]/route.ts`
- **2 usages** - `config/roles.ts`
- **1 usages** - `app/api/documents/[id]/archive/route.ts`
- **1 usages** - `components/ui/role-based-header.tsx`
- **1 usages** - `app/documents/[id]/view/page.tsx`
- **1 usages** - `app/admin/users/page.tsx`
- **1 usages** - `app/api/users/[id]/roles/route.ts`
- **1 usages** - `app/api/users/[id]/route.ts`

---

## API Routes to Update (13 routes)

- [ ] `/app/api/debug-permissions` (3 usages)
- [ ] `/app/api/documents/[id]/archive` (1 usages)
- [ ] `/app/api/documents/[id]/status` (2 usages)
- [ ] `/app/api/documents/[id]/version/[version]` (2 usages)
- [ ] `/app/api/groups/[id]/permissions` (5 usages)
- [ ] `/app/api/permissions` (15 usages)
- [ ] `/app/api/permissions/[id]` (10 usages)
- [ ] `/app/api/roles` (21 usages)
- [ ] `/app/api/roles/[id]` (16 usages)
- [ ] `/app/api/roles/[id]/permissions` (10 usages)
- [ ] `/app/api/roles/[id]/permissions-summary` (3 usages)
- [ ] `/app/api/users/[id]` (2 usages)
- [ ] `/app/api/users/[id]/roles` (1 usages)

---

## Hooks to Update (0 hooks)



---

## Components to Update (4 components)

- [ ] `components/ui/role-based-header.tsx` (1 usages)
- [ ] `components/documents/enhanced-pdf-viewer.tsx` (3 usages)
- [ ] `components/documents/documents-list.tsx` (3 usages)
- [ ] `components/admin/permission-matrix.tsx` (4 usages)

---

## Detailed Locations

### Session Property Usage (HIGH PRIORITY)

#### app/api/debug-permissions/route.ts:18
```typescript
permissions: session.user.permissions || []
```

#### app/api/debug-permissions/route.ts:21
```typescript
'documents.update': session.user.permissions?.includes('documents.update'),
```

#### app/api/debug-permissions/route.ts:22
```typescript
'documents.update.own': session.user.permissions?.includes('documents.update.own')
```

#### app/api/documents/[id]/archive/route.ts:151
```typescript
const userPermissions = session.user.permissions || [];
```

#### app/api/documents/[id]/status/route.ts:66
```typescript
const userPermissions = session.user.permissions || [];
```

#### app/api/documents/[id]/status/route.ts:316
```typescript
const userPermissions = session.user.permissions || [];
```

#### app/api/documents/[id]/version/[version]/route.ts:45
```typescript
const userPermissions = session.user.permissions || [];
```

#### app/api/documents/[id]/version/[version]/route.ts:133
```typescript
const userPermissions = session.user.permissions || [];
```

#### components/ui/role-based-header.tsx:145
```typescript
{session.user.permissions?.length || 0} permissions
```

#### lib/next-auth.ts:205
```typescript
session.user.permissions = token.permissions as string[]
```

#### app/documents/[id]/view/page.tsx:107
```typescript
canDownload={session?.user?.permissions?.includes('pdf.view') || false}
```

#### components/documents/enhanced-pdf-viewer.tsx:63
```typescript
const userPermissions = session?.user?.permissions || [];
```

### Permission Checks

#### components/documents/documents-list.tsx:138
```typescript
hasPdfDownload: (userSession?.user as any)?.permissions?.includes('pdf.download')
```

#### components/documents/documents-list.tsx:834
```typescript
{(userSession?.user?.permissions?.includes('pdf.download') ||
```

#### components/documents/documents-list.tsx:835
```typescript
userSession?.user?.permissions?.includes('documents.download') ||
```

#### app/admin/roles/page.tsx:251
```typescript
permissions: prev.permissions.includes(permissionId)
```

#### app/admin/roles/page.tsx:365
```typescript
checked={formData.permissions.includes(permission.id)}
```

#### app/admin/roles/page.tsx:671
```typescript
checked={formData.permissions.includes(permission.id)}
```

#### config/roles.ts:171
```typescript
if (roleConfig.permissions.includes('*')) return true
```

#### config/roles.ts:174
```typescript
if (roleConfig.permissions.includes(permission)) return true
```

#### lib/permissions.ts:79
```typescript
return user.permissions.includes(permissionToCheck)
```

#### lib/permissions.ts:92
```typescript
return permissionsToCheck.some(permission => user.permissions.includes(permission))
```

#### lib/permissions.ts:105
```typescript
return permissionsToCheck.every(permission => user.permissions.includes(permission))
```

#### lib/permissions.ts:166
```typescript
if (!user.permissions.includes(requiredPermission)) {
```

### Prisma Queries

#### app/api/roles/[id]/permissions/route.ts:49
```typescript
const permissions = await prisma.permission.findMany({
```

#### app/api/roles/[id]/permissions/route.ts:138
```typescript
const permission = await prisma.permission.findUnique({
```

#### app/api/groups/[id]/permissions/route.ts:31
```typescript
const availablePermissions = await prisma.permission.findMany({
```

#### app/api/groups/[id]/permissions/route.ts:154
```typescript
let permission = await prisma.permission.findFirst({
```

#### app/api/groups/[id]/permissions/route.ts:163
```typescript
permission = await prisma.permission.create({
```

#### app/api/permissions/route.ts:36
```typescript
const permissions = await prisma.permission.findMany({
```

#### app/api/permissions/route.ts:81
```typescript
const existingPermission = await prisma.permission.findFirst({
```

#### app/api/permissions/route.ts:96
```typescript
const permission = await prisma.permission.create({
```

#### app/api/permissions/[id]/route.ts:26
```typescript
const permission = await prisma.permission.findUnique({
```

#### app/api/permissions/[id]/route.ts:67
```typescript
const permission = await prisma.permission.findUnique({
```

#### app/api/permissions/[id]/route.ts:87
```typescript
const existingPermission = await prisma.permission.findFirst({
```

#### app/api/permissions/[id]/route.ts:108
```typescript
const updatedPermission = await prisma.permission.update({
```

#### app/api/permissions/[id]/route.ts:150
```typescript
const permission = await prisma.permission.findUnique({
```

#### app/api/permissions/[id]/route.ts:172
```typescript
await prisma.permission.delete({
```

#### app/api/roles/route.ts:122
```typescript
await prisma.rolePermission.createMany({
```

#### app/api/roles/[id]/permissions/route.ts:150
```typescript
const existingRolePermission = await prisma.rolePermission.findUnique({
```

#### app/api/roles/[id]/permissions/route.ts:161
```typescript
await prisma.rolePermission.update({
```

#### app/api/roles/[id]/permissions/route.ts:174
```typescript
await prisma.rolePermission.create({
```

#### app/api/roles/[id]/route.ts:123
```typescript
await prisma.rolePermission.deleteMany({
```

#### app/api/roles/[id]/route.ts:135
```typescript
await prisma.rolePermission.createMany({
```

#### app/api/groups/[id]/permissions/route.ts:176
```typescript
const existingRolePermission = await prisma.rolePermission.findUnique({
```

#### app/api/groups/[id]/permissions/route.ts:186
```typescript
const rolePermission = await prisma.rolePermission.create({
```

#### app/admin/roles/page.tsx:48
```typescript
rolePermissions: {
```

#### app/admin/roles/page.tsx:243
```typescript
permissions: role.rolePermissions?.map(rp => rp.permission.id) || []
```

#### app/admin/roles/page.tsx:473
```typescript
{role.rolePermissions?.length || 0}
```

#### app/admin/roles/page.tsx:553
```typescript
{role.rolePermissions?.length || 0}
```

#### app/admin/pdf-permissions/page.tsx:49
```typescript
const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
```

#### app/admin/pdf-permissions/page.tsx:192
```typescript
const rolePerms = rolePermissions.find(rp => rp.roleId === roleId);
```

#### app/admin/pdf-permissions/page.tsx:299
```typescript
{rolePermissions.map((rolePerms) => {
```

#### app/admin/pdf-permissions/page.tsx:371
```typescript
{rolePermissions.map((rolePerms) => {
```

#### app/admin/permissions/page.tsx:42
```typescript
rolePermissions: number
```

#### app/admin/permissions/page.tsx:572
```typescript
<div className="text-xs">{permission._count?.rolePermissions || 0} roles</div>
```

#### app/admin/permissions/page.tsx:651
```typescript
{permission._count?.rolePermissions || 0} roles
```

#### app/admin/users/page.tsx:36
```typescript
rolePermissions?: {
```

#### app/api/roles/route.ts:40
```typescript
rolePermissions: includePermissions
```

#### app/api/roles/route.ts:116
```typescript
const rolePermissionsData = validatedData.permissions.map(permissionId => ({
```

#### app/api/roles/route.ts:123
```typescript
data: rolePermissionsData,
```

#### app/api/roles/route.ts:131
```typescript
rolePermissions: {
```

#### app/api/roles/[id]/permissions-summary/route.ts:21
```typescript
rolePermissions: {
```

#### app/api/roles/[id]/permissions-summary/route.ts:40
```typescript
const permissionNames = role.rolePermissions.map(rp => rp.permission.name)
```

#### app/api/roles/[id]/permissions/route.ts:82
```typescript
rolePermissions: {
```

#### app/api/roles/[id]/permissions/route.ts:187
```typescript
rolePermissions: {
```

#### app/api/roles/[id]/route.ts:34
```typescript
rolePermissions: {
```

#### app/api/roles/[id]/route.ts:129
```typescript
const rolePermissionsData = validatedData.permissions.map(permissionId => ({
```

#### app/api/roles/[id]/route.ts:136
```typescript
data: rolePermissionsData,
```

#### app/api/roles/[id]/route.ts:145
```typescript
rolePermissions: {
```

#### app/api/permissions/route.ts:39
```typescript
rolePermissions: includeRoles
```

#### app/api/permissions/route.ts:48
```typescript
rolePermissions: true,
```

#### app/api/permissions/[id]/route.ts:29
```typescript
rolePermissions: {
```

#### app/api/permissions/[id]/route.ts:112
```typescript
rolePermissions: {
```

#### app/api/permissions/[id]/route.ts:153
```typescript
rolePermissions: true,
```

#### app/api/permissions/[id]/route.ts:165
```typescript
if (permission.rolePermissions.length > 0) {
```

#### app/api/users/[id]/roles/route.ts:376
```typescript
rolePermissions: {
```

#### app/api/users/[id]/route.ts:42
```typescript
rolePermissions: {
```

#### components/admin/permission-matrix.tsx:41
```typescript
rolePermissions: {
```

#### components/admin/permission-matrix.tsx:129
```typescript
const rolePermission = role.rolePermissions.find(rp => rp.permissionId === permissionId)
```

#### components/documents/enhanced-pdf-viewer.tsx:40
```typescript
const rolePermissions: Record<string, { canDownload: boolean; canPrint: boolean; canCopy: boolean }> = {
```

#### components/documents/enhanced-pdf-viewer.tsx:49
```typescript
return rolePermissions[role.toLowerCase()] || { canDownload: false, canPrint: false, canCopy: false };
```

#### lib/next-auth.ts:154
```typescript
rolePermissions: {
```

#### lib/next-auth.ts:178
```typescript
userRole.role.rolePermissions.map(rp => rp.permission.name)
```

#### lib/permissions.ts:31
```typescript
rolePermissions: {
```

#### lib/permissions.ts:47
```typescript
userRole.role.rolePermissions
```

---

*Generated automatically by phase1-task2-audit-permission-usage.ts*
