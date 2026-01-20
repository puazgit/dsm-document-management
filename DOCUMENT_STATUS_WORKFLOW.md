# Document Status Workflow - Role Based Transitions

## 📋 **Alur Status Dokumen yang Relevan**

### **Status Lifecycle:**
```
DRAFT → IN_REVIEW → PENDING_APPROVAL → APPROVED → PUBLISHED
  ↓         ↓               ↓             ↓       ↓      ↓
ARCHIVED  DRAFT          REJECTED      EXPIRED  ARCHIVED |
  ↑                         ↓                             |
DRAFT ←─────────────────── DRAFT     IN_REVIEW ←────────┘
                                      (Revision v2.0)
```

---

## 🔄 **Status Transitions & Role Permissions**

### **1. DRAFT → IN_REVIEW** (Submit for Review)
- **Who Can**: Document Creator, Manager+, PPD, Administrator  
- **Required Permission**: `documents.update`
- **Description**: Submit document for management review
- **Comment**: Optional

### **2. IN_REVIEW → PENDING_APPROVAL** (Forward for Approval)
- **Who Can**: Manager+, PPD, Administrator
- **Required Permission**: `documents.update` 
- **Description**: Review completed, forward for approval
- **Comment**: Optional

### **3. IN_REVIEW → DRAFT** (Return for Revision)
- **Who Can**: Manager+, PPD, Administrator
- **Required Permission**: `documents.update`
- **Description**: Send back for revision
- **Comment**: Required (explain what needs to be revised)

### **4. PENDING_APPROVAL → APPROVED** (Approve Document)
- **Who Can**: Kadiv, GM, Dirut, PPD, Administrator
- **Required Permission**: `documents.approve`
- **Description**: Approve document for publication
- **Comment**: Optional
- **Records**: Approver ID and timestamp

### **5. PENDING_APPROVAL → REJECTED** (Reject Document)  
- **Who Can**: Kadiv, GM, Dirut, PPD, Administrator
- **Required Permission**: `documents.approve`
- **Description**: Reject document with reason
- **Comment**: Required (explain rejection reason)

### **6. APPROVED → PUBLISHED** (Publish Document)
- **Who Can**: PPD, Administrator
- **Required Permission**: `documents.update`
- **Description**: Publish approved document to users
- **Comment**: Optional
- **Records**: Publisher ID and publish timestamp

### **7. REJECTED → DRAFT** (Revise After Rejection)
- **Who Can**: Document Creator, Manager+, PPD, Administrator  
- **Required Permission**: `documents.update`
- **Description**: Return to draft for revision after rejection
- **Comment**: Optional

### **8. ANY STATUS → ARCHIVED** (Archive Document)
- **Who Can**: PPD, Administrator
- **Required Permission**: `documents.delete`
- **Description**: Archive document (remove from active circulation)
- **Comment**: Optional

### **9. PUBLISHED → EXPIRED** (Mark as Expired)
- **Who Can**: PPD, Administrator, System (automatic)
- **Required Permission**: `documents.update`  
- **Description**: Mark published document as expired
- **Comment**: Optional
- **Can be automatic**: Based on expiration date

### **10. PUBLISHED → IN_REVIEW** (Start Document Revision) ⭐ NEW
- **Who Can**: PPD, Administrator
- **Required Permission**: `documents.update` + `documents.publish`
- **Description**: Start major revision of published document (creates new version)
- **Comment**: Optional (reason for revision)
- **Auto Actions**: 
  - Increments version number (e.g., 1.0 → 2.0)
  - Saves current version to document history
  - Creates DocumentVersion record
  - Maintains audit trail
- **Use Case**: Substantive changes, policy updates, major corrections

### **11. ARCHIVED → DRAFT** (Unarchive Document)
- **Who Can**: PPD, Administrator
- **Required Permission**: `documents.update`
- **Description**: Restore archived document to draft
- **Comment**: Optional


---

## 📝 **Document Revision Process**

### **When to Use PUBLISHED → IN_REVIEW (Major Revision):**
- ✅ Policy changes or procedural updates
- ✅ Major corrections or substantive changes
- ✅ Structural reorganization of content
- ✅ Changes that require re-approval process

### **Revision Workflow:**
1. **Initiate Revision**: PPD/Admin changes PUBLISHED → IN_REVIEW
2. **Auto Actions**:
   - Current published version saved to DocumentVersion table
   - Version incremented (1.0 → 2.0, 2.0 → 3.0, etc.)
   - Document enters revision workflow
3. **Follow Normal Workflow**: IN_REVIEW → PENDING_APPROVAL → APPROVED → PUBLISHED
4. **History Preserved**: All previous versions accessible in document history

### **Version Numbering:**
- **Major Version** (x.0): Substantive changes via PUBLISHED → IN_REVIEW workflow
  - Examples: 1.0 → 2.0 → 3.0
- **Minor Version** (x.y): Minor updates (future feature for direct edits)
  - Examples: 1.0 → 1.1 → 1.2

### **Benefits:**
- ✅ Complete audit trail of all document changes
- ✅ Previous versions remain accessible
- ✅ Maintains quality control through approval workflow
- ✅ Clear version history for compliance

---

## 👥 **Role Hierarchy & Permissions**

### **Administrator** (Level 100)
- ✅ **All Permissions**: Complete workflow control
- ✅ **Can Bypass**: Any workflow restrictions
- ✅ **Special Access**: System-level operations

### **PPD - Penanggung Jawab Dokumen** (Level 90)
- ✅ **Document Lifecycle Management**: Full document workflow control
- ✅ **Publishing Authority**: Can publish approved documents  
- ✅ **Archive Authority**: Can archive/unarchive documents
- ✅ **Expiration Management**: Can mark documents as expired

### **Kadiv - Kepala Divisi** (Level 80)
- ✅ **Approval Authority**: Can approve/reject documents
- ✅ **Review Authority**: Can review and forward documents
- ✅ **Creation & Updates**: Can create and update documents

### **GM - General Manager** (Level 70) 
- ✅ **Approval Authority**: Can approve/reject documents
- ✅ **Review Authority**: Can review documents
- ❌ **Publishing**: Cannot publish (PPD responsibility)

### **Manager** (Level 60)
- ✅ **Review Authority**: Can review and process documents
- ✅ **Creation & Updates**: Can create and update documents  
- ❌ **Approval**: Cannot approve (need Kadiv+ level)

### **Dirut - Direktur Utama** (Level 50)
- ✅ **Approval Authority**: Can approve/reject documents
- ✅ **Executive Review**: High-level document access
- ❌ **Publishing**: Cannot publish (PPD responsibility)

### **Dewas, Komite Audit, Members, Viewer** (Level 40-10)
- ✅ **Read Only**: Can view documents based on access permissions
- ❌ **Workflow Actions**: Cannot modify document status

---

## 📊 **Database Tracking**

### **Document Table Updates:**
- `status` - Current document status
- `approvedById` - User who approved (when APPROVED)
- `approvedAt` - Timestamp of approval
- `publishedAt` - Timestamp when published  
- `updatedById` - Last user who modified
- `updatedAt` - Last modification timestamp

### **DocumentActivity Logging:**
- Every status change is logged with:
  - `action: 'UPDATE'`
  - `description` - Details of status change
  - `metadata.statusChange` - From/to status info
  - `userId` - Who made the change
  - `createdAt` - When the change occurred

### **Comments System:**
- Status change comments are stored as document comments
- Required for: REJECTED transitions, IN_REVIEW → DRAFT
- Optional for: Other transitions

### **Notifications:**
- Document owner notified of status changes
- Approval/rejection notifications sent automatically
- Publication notifications for stakeholders

---

## 🔧 **Implementation Features**

### **UI Components:**
- `DocumentStatusWorkflow` - Interactive status display with action buttons
- Status badges with icons and colors
- Dropdown menu for available transitions
- Confirmation dialogs with comment input

### **API Endpoints:**
- `POST /api/documents/[id]/status` - Change document status
- `GET /api/documents/[id]/status` - Get status info and allowed transitions

### **Security:**
- Role-based permission checking
- Transition validation before execution  
- Audit trail for all changes
- Comment requirements enforced

### **User Experience:**
- Clear visual status indicators
- Context-aware action buttons
- Descriptive transition names
- Helpful error messages

---

## ✅ **Benefits of This Workflow**

1. **Clear Process**: Defined stages from creation to publication
2. **Role Separation**: Appropriate authority levels for each action  
3. **Audit Trail**: Complete tracking of all document changes
4. **Quality Control**: Review and approval gates prevent errors
5. **Flexibility**: Can handle various document types and requirements
6. **Notifications**: Stakeholders informed of important changes
7. **Security**: Permission-based access control
8. **Rollback Capability**: Can return documents to previous states when needed

---

## 🚀 **Next Steps for Implementation**

1. ✅ **Status Workflow Config** - Complete with role mappings
2. ✅ **API Endpoints** - Status change and transition info  
3. ✅ **UI Components** - Interactive workflow controls
4. ✅ **Database Tracking** - Activity logging and notifications
5. 🔄 **Testing** - Verify all transitions work correctly
6. 📋 **Documentation** - User guides for each role
7. 🎯 **Training** - Educate users on new workflow process