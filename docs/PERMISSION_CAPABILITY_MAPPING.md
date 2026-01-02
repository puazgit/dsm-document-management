# Permission → Capability Mapping

**Date:** January 2, 2026  
**Status:** Phase 1 - Preparation  
**Total Permissions:** 53

---

## 📊 Complete Mapping Table

| Legacy Permission      | New Capability          | Category     | Status | Notes                    |
|------------------------|-------------------------|--------------|--------|--------------------------|
| audit.analytics        | AUDIT_ANALYTICS         | audit        | ✅     | View audit analytics     |
| audit.export           | AUDIT_EXPORT            | audit        | ✅     | Export audit reports     |
| audit.read             | AUDIT_READ              | audit        | ✅     | View audit logs          |
| audit.view             | AUDIT_VIEW              | audit        | ✅     | Duplicate of audit.read  |
| comments.create        | COMMENT_CREATE          | document     | ✅     | Create comments          |
| comments.delete        | COMMENT_DELETE          | document     | ✅     | Delete comments          |
| comments.moderate      | COMMENT_MODERATE        | document     | ✅     | Moderate comments        |
| comments.read          | COMMENT_READ            | document     | ✅     | View comments            |
| comments.update        | COMMENT_UPDATE          | document     | ✅     | Edit comments            |
| document-types.create  | DOCUMENT_TYPE_CREATE    | document     | ✅     | Create document types    |
| document-types.delete  | DOCUMENT_TYPE_DELETE    | document     | ✅     | Delete document types    |
| document-types.read    | DOCUMENT_TYPE_READ      | document     | ✅     | View document types      |
| document-types.update  | DOCUMENT_TYPE_UPDATE    | document     | ✅     | Update document types    |
| documents.approve      | DOCUMENT_APPROVE        | document     | ✅     | Approve documents        |
| documents.create       | DOCUMENT_CREATE         | document     | ✅     | Create documents         |
| documents.delete       | DOCUMENT_DELETE         | document     | ✅     | Delete documents         |
| documents.delete.own   | DOCUMENT_DELETE_OWN     | document     | ✅     | Delete own documents     |
| documents.download     | DOCUMENT_DOWNLOAD       | document     | ✅     | Download documents       |
| documents.read         | DOCUMENT_READ           | document     | ✅     | View documents           |
| documents.read.own     | DOCUMENT_READ_OWN       | document     | ✅     | View own documents       |
| documents.update       | DOCUMENT_UPDATE         | document     | ✅     | Update documents         |
| documents.update.own   | DOCUMENT_UPDATE_OWN     | document     | ✅     | Edit own documents       |
| documents.upload       | DOCUMENT_UPLOAD         | document     | ✅     | Upload documents         |
| documents.view         | DOCUMENT_VIEW           | document     | ✅     | Duplicate of docs.read   |
| groups.create          | GROUP_CREATE            | user         | ✅     | Create groups            |
| groups.delete          | GROUP_DELETE            | user         | ✅     | Delete groups            |
| groups.update          | GROUP_UPDATE            | user         | ✅     | Update groups            |
| groups.view            | GROUP_VIEW              | user         | ✅     | View groups              |
| pdf.copy               | PDF_COPY                | document     | ✅     | Copy PDF content         |
| pdf.download           | PDF_DOWNLOAD            | document     | ✅     | Download PDF             |
| pdf.print              | PDF_PRINT               | document     | ✅     | Print PDF                |
| pdf.view               | PDF_VIEW                | document     | ✅     | View PDF                 |
| pdf.watermark          | PDF_WATERMARK           | document     | ✅     | PDF without watermark    |
| permissions.manage     | PERMISSION_MANAGE       | system       | ✅     | Manage permissions       |
| permissions.view       | PERMISSION_VIEW         | system       | ✅     | View permissions         |
| roles.assign           | ROLE_ASSIGN             | user         | ✅     | Assign roles             |
| roles.create           | ROLE_CREATE             | user         | ✅     | Create roles             |
| roles.delete           | ROLE_DELETE             | user         | ✅     | Delete roles             |
| roles.read             | ROLE_READ               | user         | ✅     | View roles               |
| roles.update           | ROLE_UPDATE             | user         | ✅     | Update roles             |
| roles.view             | ROLE_VIEW               | user         | ✅     | Duplicate of roles.read  |
| settings.update        | SETTINGS_UPDATE         | system       | ✅     | Update settings          |
| settings.view          | SETTINGS_VIEW           | system       | ✅     | View settings            |
| system.admin           | SYSTEM_ADMIN            | system       | ✅     | System administration    |
| system.analytics       | SYSTEM_ANALYTICS        | system       | ✅     | View analytics           |
| system.logs            | SYSTEM_LOGS             | system       | ✅     | View system logs         |
| system.settings        | SYSTEM_SETTINGS         | system       | ✅     | System settings          |
| users.create           | USER_CREATE             | user         | ✅     | Create users             |
| users.delete           | USER_DELETE             | user         | ✅     | Delete users             |
| users.profile          | USER_PROFILE            | user         | ✅     | Manage own profile       |
| users.read             | USER_READ               | user         | ✅     | View users               |
| users.update           | USER_UPDATE             | user         | ✅     | Update users             |
| users.view             | USER_VIEW               | user         | ✅     | Duplicate of users.read  |

---

## 📦 Grouped by Category

### AUDIT (4 capabilities)
- `AUDIT_ANALYTICS` - View audit analytics
- `AUDIT_EXPORT` - Export audit reports
- `AUDIT_READ` - View audit logs
- `AUDIT_VIEW` - View audit logs (duplicate)

### DOCUMENT (24 capabilities)
- `COMMENT_CREATE` - Create comments
- `COMMENT_DELETE` - Delete comments
- `COMMENT_MODERATE` - Moderate comments
- `COMMENT_READ` - View comments
- `COMMENT_UPDATE` - Edit comments
- `DOCUMENT_APPROVE` - Approve documents
- `DOCUMENT_CREATE` - Create documents
- `DOCUMENT_DELETE` - Delete documents
- `DOCUMENT_DELETE_OWN` - Delete own documents
- `DOCUMENT_DOWNLOAD` - Download documents
- `DOCUMENT_READ` - View documents
- `DOCUMENT_READ_OWN` - View own documents
- `DOCUMENT_TYPE_CREATE` - Create document types
- `DOCUMENT_TYPE_DELETE` - Delete document types
- `DOCUMENT_TYPE_READ` - View document types
- `DOCUMENT_TYPE_UPDATE` - Update document types
- `DOCUMENT_UPDATE` - Update documents
- `DOCUMENT_UPDATE_OWN` - Edit own documents
- `DOCUMENT_UPLOAD` - Upload documents
- `DOCUMENT_VIEW` - View documents (duplicate)
- `PDF_COPY` - Copy PDF content
- `PDF_DOWNLOAD` - Download PDF
- `PDF_PRINT` - Print PDF
- `PDF_VIEW` - View PDF
- `PDF_WATERMARK` - PDF without watermark

### SYSTEM (8 capabilities)
- `PERMISSION_MANAGE` - Manage permissions
- `PERMISSION_VIEW` - View permissions
- `SETTINGS_UPDATE` - Update settings
- `SETTINGS_VIEW` - View settings
- `SYSTEM_ADMIN` - System administration
- `SYSTEM_ANALYTICS` - View analytics
- `SYSTEM_LOGS` - View system logs
- `SYSTEM_SETTINGS` - System settings

### USER (13 capabilities)
- `GROUP_CREATE` - Create groups
- `GROUP_DELETE` - Delete groups
- `GROUP_UPDATE` - Update groups
- `GROUP_VIEW` - View groups
- `ROLE_ASSIGN` - Assign roles
- `ROLE_CREATE` - Create roles
- `ROLE_DELETE` - Delete roles
- `ROLE_READ` - View roles
- `ROLE_UPDATE` - Update roles
- `ROLE_VIEW` - View roles (duplicate)
- `USER_CREATE` - Create users
- `USER_DELETE` - Delete users
- `USER_PROFILE` - Manage own profile
- `USER_READ` - View users
- `USER_UPDATE` - Update users
- `USER_VIEW` - View users (duplicate)

---

## 🔄 Naming Convention

### Pattern
```
{MODULE}_{ACTION}
```

### Examples
- `documents.read` → `DOCUMENT_READ`
- `pdf.download` → `PDF_DOWNLOAD`
- `users.create` → `USER_CREATE`
- `system.admin` → `SYSTEM_ADMIN`

### Special Cases
- `documents.update.own` → `DOCUMENT_UPDATE_OWN` (scoped action)
- `document-types.create` → `DOCUMENT_TYPE_CREATE` (hyphenated module)

---

## ⚠️ Duplicates to Resolve

Some permissions have semantic duplicates that should be consolidated:

| Original Set                     | Recommended Capability | Action Required       |
|----------------------------------|------------------------|-----------------------|
| `audit.read` + `audit.view`      | `AUDIT_READ`           | Map both to AUDIT_READ |
| `documents.read` + `documents.view` | `DOCUMENT_READ`     | Map both to DOCUMENT_READ |
| `roles.read` + `roles.view`      | `ROLE_READ`            | Map both to ROLE_READ |
| `users.read` + `users.view`      | `USER_READ`            | Map both to USER_READ |

---

## 🔧 Migration Script Usage

### For Code Changes
Use this mapping when updating code:

```typescript
// OLD
if (session.user.permissions?.includes('documents.read')) {
  // ...
}

// NEW
if (hasCapability(session.user, 'DOCUMENT_READ')) {
  // ...
}
```

### For Hook Updates (use-role-visibility)
```typescript
const capabilityMap: Record<string, string> = {
  'documents.read': 'DOCUMENT_READ',
  'documents.create': 'DOCUMENT_CREATE',
  'documents.update': 'DOCUMENT_UPDATE',
  'documents.update.own': 'DOCUMENT_UPDATE_OWN',
  'documents.delete': 'DOCUMENT_DELETE',
  'documents.approve': 'DOCUMENT_APPROVE',
  'pdf.view': 'PDF_VIEW',
  'pdf.download': 'PDF_DOWNLOAD',
  'pdf.print': 'PDF_PRINT',
  'pdf.copy': 'PDF_COPY',
  'pdf.watermark': 'PDF_WATERMARK',
  // ... full mapping
}
```

---

## 📝 Notes

1. **Already Created:** PDF capabilities (5) already exist in database
2. **Need to Create:** 48 additional capabilities for complete coverage
3. **Category Assignment:**
   - `audit` → audit
   - `comments`, `documents`, `document-types`, `pdf` → document
   - `permissions`, `settings`, `system` → system
   - `groups`, `roles`, `users` → user

4. **Backward Compatibility:** During transition, maintain mapping in useRoleVisibility hook

---

*Generated: January 2, 2026*
*Phase: 1 (Preparation)*
