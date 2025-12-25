# Hardcode Optimization Report - DSM Document Management System

Berikut adalah hardcoded values yang bisa dioptimalkan dengan memindahkannya ke database:

---

## 🔴 **Priority 1: Critical Hardcodes (High Impact)**

### 1. **Role Names Checks** (20+ locations)
**Current Implementation:**
```typescript
// src/lib/document-access.ts:50
if (user.role === 'admin' || user.role === 'org_administrator')

// src/app/api/documents/stats/route.ts:16
session.user.role === 'ADMIN' ? {} : {...}

// src/config/document-workflow.ts:214
if (userRole === 'administrator' || userRole === 'admin')
```

**Problem:**
- Hardcoded role names di 20+ files
- Case sensitivity issues ('admin' vs 'ADMIN')
- Sulit maintain jika ada perubahan role structure

**Optimization:**
```sql
-- Create role_capabilities table
CREATE TABLE role_capabilities (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'ADMIN_ACCESS', 'DOCUMENT_FULL_ACCESS'
  description TEXT
);

-- Create role_capability_assignments
CREATE TABLE role_capability_assignments (
  role_id UUID REFERENCES roles(id),
  capability_id UUID REFERENCES role_capabilities(id),
  PRIMARY KEY (role_id, capability_id)
);
```

**New Code:**
```typescript
// Check by capability instead of role name
async function hasCapability(user: User, capability: string): Promise<boolean> {
  const capabilities = await prisma.roleCapability.findMany({
    where: {
      roleCapabilityAssignments: {
        some: {
          role: {
            userRoles: {
              some: { userId: user.id }
            }
          }
        }
      },
      name: capability
    }
  });
  return capabilities.length > 0;
}

// Usage
if (await hasCapability(user, 'ADMIN_ACCESS')) {
  // Allow admin operations
}
```

**Benefits:**
- ✅ No hardcoded role names
- ✅ Flexible role management
- ✅ Add new capabilities without code changes
- ✅ Database-driven authorization

---

### 2. **Workflow Level Thresholds** (Multiple locations)
**Current Implementation:**
```typescript
// src/config/document-workflow.ts
{
  from: DocumentStatus.DRAFT,
  to: DocumentStatus.PENDING_REVIEW,
  minLevel: 50, // Hardcoded!
  requiredPermissions: ['documents.update'],
}

// src/app/api/documents/[id]/status/route.ts:365
userLevel >= 70 // Hardcoded threshold!
```

**Problem:**
- Hardcoded level numbers (50, 70, 100)
- Tidak bisa diubah tanpa deploy code
- Business rules terikat dengan code

**Optimization:**
```sql
-- Create workflow_transitions table
CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY,
  from_status VARCHAR(50) NOT NULL,
  to_status VARCHAR(50) NOT NULL,
  min_level INTEGER NOT NULL,
  required_permission VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_status, to_status)
);

-- Seed data
INSERT INTO workflow_transitions VALUES
('uuid1', 'DRAFT', 'PENDING_REVIEW', 50, 'documents.update', 'Submit for review', true),
('uuid2', 'PENDING_REVIEW', 'PENDING_APPROVAL', 70, 'documents.update', 'Forward for approval', true),
('uuid3', 'PENDING_APPROVAL', 'APPROVED', 70, 'documents.approve', 'Approve document', true);
```

**New Code:**
```typescript
async function getAllowedTransitions(
  currentStatus: string, 
  userLevel: number,
  userPermissions: string[]
) {
  return await prisma.workflowTransition.findMany({
    where: {
      fromStatus: currentStatus,
      minLevel: { lte: userLevel },
      requiredPermission: { in: userPermissions },
      isActive: true
    }
  });
}
```

**Benefits:**
- ✅ Configure workflow via admin UI
- ✅ No code deploy untuk perubahan workflow
- ✅ Audit trail untuk workflow changes
- ✅ A/B testing different workflows

---

## 🟡 **Priority 2: Medium Impact Hardcodes**

### 3. **Document Status Colors** (Multiple UI files)
**Current Implementation:**
```typescript
// src/app/documents/page.tsx:22
const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 hover:bg-green-200',
  // ... hardcoded di multiple files
};
```

**Optimization:**
```sql
-- Create status_configurations table
CREATE TABLE status_configurations (
  id UUID PRIMARY KEY,
  status_name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  color_class VARCHAR(200) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER,
  is_active BOOLEAN DEFAULT true
);

-- Seed
INSERT INTO status_configurations VALUES
('uuid1', 'DRAFT', 'Draft', 'bg-gray-100 text-gray-800', 'file-text', 1, true),
('uuid2', 'PENDING_REVIEW', 'Pending Review', 'bg-yellow-100 text-yellow-800', 'clock', 2, true);
```

**New Code:**
```typescript
// API endpoint
export async function GET() {
  const statuses = await prisma.statusConfiguration.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  return NextResponse.json({ statuses });
}

// Frontend
const { data: statusConfigs } = useSWR('/api/status-configs');
const getStatusColor = (status: string) => 
  statusConfigs?.find(s => s.statusName === status)?.colorClass;
```

**Benefits:**
- ✅ Customize colors per tenant/organization
- ✅ Add new statuses without code changes
- ✅ Consistent UI across application

---

### 4. **Level-to-Badge Color Mapping**
**Current Implementation:**
```typescript
// src/components/admin/user-group-assignment.tsx:231
if (level >= 9) return 'destructive' // High level
if (level >= 7) return 'default'     // Middle level
if (level >= 5) return 'secondary'   // Senior level

// src/app/admin/groups/page.tsx:238
if (level >= 9) return 'bg-red-500 hover:bg-red-600'
if (level >= 7) return 'bg-orange-500 hover:bg-orange-600'
```

**Optimization:**
```sql
CREATE TABLE level_visual_configs (
  id UUID PRIMARY KEY,
  min_level INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  badge_variant VARCHAR(50),
  color_class VARCHAR(200),
  label VARCHAR(100),
  CONSTRAINT unique_level_range UNIQUE(min_level, max_level)
);

INSERT INTO level_visual_configs VALUES
('uuid1', 90, 100, 'destructive', 'bg-red-500', 'Executive'),
('uuid2', 70, 89, 'default', 'bg-orange-500', 'Manager'),
('uuid3', 50, 69, 'secondary', 'bg-yellow-500', 'Senior');
```

---

## 🟢 **Priority 3: Nice-to-Have Optimizations**

### 5. **Permission Name Patterns**
**Current Implementation:**
```typescript
// src/lib/document-access.ts
const hasFullAccess = 
  permissions.includes('documents.read') &&
  permissions.includes('documents.create') &&
  permissions.includes('documents.update') &&
  permissions.includes('documents.approve') &&
  permissions.includes('documents.delete');
```

**Optimization:**
```sql
CREATE TABLE permission_groups (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE, -- e.g., 'DOCUMENT_FULL_ACCESS'
  description TEXT
);

CREATE TABLE permission_group_members (
  group_id UUID REFERENCES permission_groups(id),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (group_id, permission_id)
);
```

**New Code:**
```typescript
async function hasPermissionGroup(user: User, groupName: string) {
  const group = await prisma.permissionGroup.findUnique({
    where: { name: groupName },
    include: {
      members: {
        include: { permission: true }
      }
    }
  });
  
  const requiredPerms = group.members.map(m => m.permission.name);
  return requiredPerms.every(p => userPermissions.includes(p));
}
```

---

### 6. **File Size/Type Validation**
**Current Implementation:**
```typescript
// Scattered across upload handlers
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB hardcoded
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg']; // hardcoded
```

**Optimization:**
```sql
CREATE TABLE upload_constraints (
  id UUID PRIMARY KEY,
  context VARCHAR(50), -- 'document', 'avatar', 'attachment'
  max_file_size BIGINT,
  allowed_mime_types TEXT[], -- array of mime types
  max_files_per_upload INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📊 **Summary: Potential Database Tables**

```sql
-- Priority 1 (Critical)
✅ role_capabilities
✅ role_capability_assignments
✅ workflow_transitions

-- Priority 2 (Medium)
✅ status_configurations
✅ level_visual_configs

-- Priority 3 (Nice-to-Have)
✅ permission_groups
✅ permission_group_members
✅ upload_constraints
✅ feature_flags
✅ system_settings
```

---

## 🎯 **Implementation Roadmap**

### **Phase 1 (Week 1-2): Critical Hardcodes**
1. Create `role_capabilities` system
2. Migrate hardcoded role checks to capability checks
3. Create `workflow_transitions` table
4. Build admin UI for workflow management

### **Phase 2 (Week 3-4): Medium Impact**
1. Create `status_configurations`
2. Build UI customization admin panel
3. Migrate all status color mappings

### **Phase 3 (Week 5-6): Polish**
1. Permission groups
2. Upload constraints
3. System settings table
4. Feature flags for gradual rollout

---

## 💡 **Benefits Summary**

**Flexibility:**
- ✅ Configure business rules without code deploy
- ✅ A/B testing different workflows
- ✅ Multi-tenant customization

**Maintainability:**
- ✅ Reduce hardcoded strings in codebase
- ✅ Single source of truth in database
- ✅ Easier to audit and test

**Scalability:**
- ✅ Support multiple organizations with different rules
- ✅ Dynamic feature flags
- ✅ Version control for business rules

**Cost:**
- ⚠️ Requires database migrations
- ⚠️ Need admin UI for configuration
- ⚠️ Migration effort: ~3-6 weeks

---

## 🚀 **Quick Wins (Can Start Today)**

### **1. Create System Settings Table**
```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Examples
INSERT INTO system_settings VALUES
('workflow.draft_to_review.min_level', '{"value": 50}', 'Min level for draft to review transition', 'workflow', false, NOW(), NULL),
('ui.status.draft.color', '{"value": "bg-gray-100 text-gray-800"}', 'Draft status color', 'ui', true, NOW(), NULL),
('upload.max_file_size', '{"value": 10485760}', 'Max upload size in bytes', 'upload', false, NOW(), NULL);
```

### **2. Utility Function**
```typescript
// src/lib/settings.ts
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key }
  });
  return setting?.value?.value ?? defaultValue;
}

// Usage
const minLevel = await getSetting('workflow.draft_to_review.min_level', 50);
const maxFileSize = await getSetting('upload.max_file_size', 10485760);
```

---

**End of Report**
