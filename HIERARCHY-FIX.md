# DSM - Corrected Hierarchy Documentation

## Proper Access Control Hierarchy

### Current Structure (FIXED):
```
User → Group → Role → Permission
```

### Explanation:

1. **Groups** = Organizational Units (Department/Division level)
   - `administrator` - IT/System Admin Department  
   - `ppd` - Document Management Department
   - `kadiv` - Division Head Level
   - `manager` - Management Level
   - `members` - Regular Staff

2. **Roles** = Functional Capabilities (What you can do)
   - `admin` - Full system control
   - `editor` - Content creation/editing
   - `viewer` - Read-only access

3. **Permissions** = Granular Actions (Specific operations)
   - `documents.create` 
   - `documents.read`
   - `users.manage`
   - `system.admin`

### Flow:
1. **User** belongs to a **Group** (organizational placement)
2. **Group** has available **Roles** (functional capabilities in that context)  
3. **User** gets specific **Role(s)** within their **Group**
4. **Role** has **Permissions** (what they can actually do)

### Example:
- John is in `ppd` group (Document Management Dept)
- `ppd` group has roles: `admin`, `editor`, `viewer` available
- John has `editor` role in `ppd` group
- `editor` role has permissions: `documents.create`, `documents.read`, `documents.update`
- Therefore John can create/read/update documents

### Benefits:
- **Context-aware**: Same role can have different meanings in different groups
- **Scalable**: Easy to add new groups/departments
- **Flexible**: Users can have different roles in different groups
- **Clear separation**: Organizational structure vs functional capabilities

### API Changes Needed:
- `/api/groups/{id}/roles` - Manage available roles in a group  
- `/api/users/{id}/groups/{groupId}/roles` - Manage user's role in specific group
- `/api/groups/{id}/users` - List users in a group with their roles
- Update authentication to check: user → group → role → permission

### Migration Path:
1. Create new tables: `group_roles`, `user_group_roles`
2. Migrate existing data from old structure
3. Update APIs to use new hierarchy
4. Update frontend to reflect new structure
5. Deprecate old `user_roles` table (keep for backward compatibility)