# Document Management System (DSM) - Spesifikasi Aplikasi

## Overview
Document Management System (DSM) adalah aplikasi enterprise untuk mengelola dokumen-dokumen perusahaan dengan sistem otentikasi berbasis peran (role-based access control), workflow approval, dan sistem kolaborasi terintegrasi.

## Arsitektur Aplikasi

### Technology Stack
- **Backend**: Next.js 14+ dengan App Router
- **Database**: PostgreSQL dengan Prisma ORM
- **Authentication**: JWT dengan role-based access control
- **File Storage**: Local storage atau Cloud (AWS S3/Google Cloud)
- **PDF Viewer**: React-PDF atau PDF.js
- **Real-time**: WebSocket atau Server-Sent Events
- **UI Framework**: Shadcn/ui dengan Tailwind CSS

### File Management Architecture
```
storage/
├── documents/
│   ├── panduan-sistem/
│   ├── prosedur/
│   ├── instruksi-kerja-khusus/
│   ├── instruksi-kerja-umum/
│   ├── dokumen-internal/
│   ├── dokumen-eksternal/
│   └── dokumen-eksternal-smk3/
├── thumbnails/
├── temp/
└── archive/
```

## Struktur Database

### Database Schema

#### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    group_id INTEGER REFERENCES groups(id),
    divisi_id INTEGER REFERENCES divisi(id)
);
```

#### 2. Groups Table (Role Management)
```sql
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    description TEXT,
    permissions JSONB,
    level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Groups
INSERT INTO groups (name, display_name, level) VALUES
('administrator', 'Administrator', 10),
('ppd', 'Penanggung Jawab Dokumen', 9),
('kadiv', 'Kepala Divisi', 8),
('gm', 'General Manager', 7),
('manager', 'Manager', 6),
('dirut', 'Direktur Utama', 5),
('dewas', 'Dewan Pengawas', 4),
('komite_audit', 'Komite Audit', 3),
('members', 'Members', 1);
```

#### 3. Documents Table
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    mime_type VARCHAR(100),
    document_type_id INTEGER REFERENCES documents_type(id),
    version VARCHAR(50) DEFAULT '1.0',
    status VARCHAR(50) DEFAULT 'draft',
    is_public BOOLEAN DEFAULT false,
    access_groups JSONB,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    published_at TIMESTAMP,
    expires_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Documents Type Table
```sql
CREATE TABLE documents_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(50),
    access_level INTEGER DEFAULT 1,
    required_approval BOOLEAN DEFAULT false,
    retention_period INTEGER, -- days
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Document Types
INSERT INTO documents_type (name, slug, access_level, required_approval) VALUES
('Panduan Sistem Manajemen', 'panduan-sistem-manajemen', 8, true),
('Prosedur', 'prosedur', 6, true),
('Instruksi Kerja Bersifat Khusus', 'instruksi-kerja-khusus', 5, true),
('Instruksi Kerja Bersifat Umum', 'instruksi-kerja-umum', 3, false),
('Dokumen Internal', 'dokumen-internal', 4, false),
('Dokumen Eksternal', 'dokumen-eksternal', 2, false),
('Dokumen Eksternal SMK3', 'dokumen-eksternal-smk3', 6, true);
```

#### 5. Comments Table
```sql
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. Divisi Table
```sql
CREATE TABLE divisi (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    head_id INTEGER REFERENCES users(id),
    parent_id INTEGER REFERENCES divisi(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. PPD Table
```sql
CREATE TABLE ppd (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    divisi_id INTEGER REFERENCES divisi(id),
    document_type_ids INTEGER[],
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id)
);
```

#### 8. Menu Table (Dynamic Navigation)
```sql
CREATE TABLE menu (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500),
    icon VARCHAR(100),
    parent_id INTEGER REFERENCES menu(id),
    sort_order INTEGER DEFAULT 0,
    access_groups INTEGER[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 9. Notifications Table
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(500) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 10. Document Activity Log
```sql
CREATE TABLE document_activities (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id),
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Fitur Utama

### 1. Manajemen Dokumen

#### Upload & Storage
```typescript
interface DocumentUpload {
  title: string;
  description?: string;
  file: File;
  documentType: string;
  tags?: string[];
  accessGroups?: number[];
  expiresAt?: Date;
}
```

#### Kategorisasi Dokumen
- **Panduan Sistem Manajemen** - Level akses tinggi, perlu approval
- **Prosedur** - Dokumen prosedur operasional
- **Instruksi Kerja Bersifat Khusus** - Instruksi spesifik departemen
- **Instruksi Kerja Bersifat Umum** - Instruksi umum perusahaan
- **Dokumen Internal** - Dokumen internal perusahaan
- **Dokumen Eksternal** - Dokumen dari pihak eksternal
- **Dokumen Eksternal SMK3** - Dokumen SMK3 dari eksternal

#### Document Versioning
```typescript
interface DocumentVersion {
  version: string;
  changes: string;
  previousVersion?: string;
  createdBy: number;
  createdAt: Date;
}
```

### 2. Sistem Otentikasi & Otorisasi

#### Role Hierarchy & Permissions
```typescript
enum UserRole {
  ADMINISTRATOR = 'administrator',    // Level 10 - Full access
  PPD = 'ppd',                       // Level 9 - Document responsibility
  KADIV = 'kadiv',                   // Level 8 - Division head
  GM = 'gm',                         // Level 7 - General Manager
  MANAGER = 'manager',               // Level 6 - Manager
  DIRUT = 'dirut',                   // Level 5 - Director
  DEWAS = 'dewas',                   // Level 4 - Board of Supervisors
  KOMITE_AUDIT = 'komite_audit',     // Level 3 - Audit Committee
  MEMBERS = 'members'                // Level 1 - Regular members
}

interface Permissions {
  documents: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    approve: boolean;
    publish: boolean;
  };
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  admin: {
    access: boolean;
    systemConfig: boolean;
  };
}
```

#### Access Control Matrix
```typescript
const AccessMatrix = {
  'panduan-sistem-manajemen': ['administrator', 'dirut', 'gm', 'kadiv'],
  'prosedur': ['administrator', 'ppd', 'dirut', 'gm', 'manager', 'kadiv'],
  'instruksi-kerja-khusus': ['administrator', 'ppd', 'manager', 'kadiv'],
  'instruksi-kerja-umum': ['administrator', 'ppd', 'members'],
  'dokumen-internal': ['administrator', 'ppd', 'manager', 'kadiv'],
  'dokumen-eksternal': ['administrator', 'ppd', 'members'],
  'dokumen-eksternal-smk3': ['administrator', 'ppd', 'dirut', 'gm', 'manager']
};
```

### 3. Sistem Komentar & Notifikasi

#### Threading Comments System
```typescript
interface Comment {
  id: number;
  documentId: number;
  parentId?: number;
  userId: number;
  content: string;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  replies?: Comment[];
  user: User;
}
```

#### Real-time Notification System
```typescript
interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  isRead: boolean;
  readAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

// Notification Types
enum NotificationType {
  DOCUMENT_UPLOADED = 'document_uploaded',
  DOCUMENT_APPROVED = 'document_approved',
  DOCUMENT_REJECTED = 'document_rejected',
  COMMENT_ADDED = 'comment_added',
  COMMENT_REPLIED = 'comment_replied',
  DOCUMENT_EXPIRED = 'document_expired',
  ACCESS_GRANTED = 'access_granted'
}
```

### 4. Document Viewer PDF Terintegrasi

#### PDF Viewer Features
- **Zoom controls** - In/out, fit to width/page
- **Navigation** - Page navigation, thumbnails
- **Search** - Text search within document
- **Annotations** - Highlight, notes (if enabled)
- **Download control** - Based on permissions
- **Print control** - Based on permissions

```typescript
interface PDFViewerConfig {
  enableDownload: boolean;
  enablePrint: boolean;
  enableAnnotations: boolean;
  enableSearch: boolean;
  watermark?: string;
  trackViewing: boolean;
}
```

## Controllers & API Structure

### 1. Authentication Controller

#### API Endpoints
```typescript
// Authentication Routes
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/change-password
POST /api/auth/forgot-password
POST /api/auth/reset-password

// User Management
GET    /api/users
POST   /api/users
GET    /api/users/[id]
PUT    /api/users/[id]
DELETE /api/users/[id]
PUT    /api/users/[id]/status
PUT    /api/users/[id]/group

// Group Management
GET    /api/groups
POST   /api/groups
PUT    /api/groups/[id]
DELETE /api/groups/[id]
```

#### Authentication Implementation
```typescript
// Middleware for protected routes
export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await getUserById(payload.userId);
    
    if (!user || !user.isActive) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Attach user to request
    req.user = user;
    return NextResponse.next();
  } catch (error) {
    return new Response('Invalid token', { status: 401 });
  }
}
```

### 2. Documents Controller

#### API Endpoints
```typescript
// Document CRUD
GET    /api/documents                 // List with filters
POST   /api/documents                 // Upload new document
GET    /api/documents/[id]           // Get document details
PUT    /api/documents/[id]           // Update document
DELETE /api/documents/[id]           // Delete document
GET    /api/documents/[id]/download  // Download file
GET    /api/documents/[id]/view      // View document (PDF)

// Document Management
POST   /api/documents/[id]/approve   // Approve document
POST   /api/documents/[id]/reject    // Reject document
POST   /api/documents/[id]/publish   // Publish document
GET    /api/documents/[id]/versions  // Get version history
POST   /api/documents/[id]/version   // Create new version

// Document Types
GET    /api/document-types           // List document types
POST   /api/document-types           // Create document type
PUT    /api/document-types/[id]      // Update document type
```

#### Document Filter & Search
```typescript
interface DocumentFilter {
  type?: string;
  status?: string;
  createdBy?: number;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  search?: string;
  divisi?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### 3. Dashboard Controller

#### API Endpoints
```typescript
// Dashboard Data
GET /api/dashboard/stats           // Summary statistics
GET /api/dashboard/recent-docs     // Recent documents
GET /api/dashboard/pending-approvals // Documents pending approval
GET /api/dashboard/notifications   // User notifications
GET /api/dashboard/activities      // Recent activities
```

#### Dashboard Statistics
```typescript
interface DashboardStats {
  totalDocuments: number;
  pendingApprovals: number;
  documentsThisMonth: number;
  totalDownloads: number;
  documentsByType: {
    type: string;
    count: number;
  }[];
  recentActivities: Activity[];
  popularDocuments: Document[];
}
```

### 4. Admin Controller

#### API Endpoints
```typescript
// System Administration
GET    /api/admin/system-info       // System information
GET    /api/admin/audit-logs        // System audit logs
POST   /api/admin/backup           // Create system backup
POST   /api/admin/maintenance      // Maintenance mode

// User Administration
GET    /api/admin/users            // User management
POST   /api/admin/users/bulk       // Bulk user operations
GET    /api/admin/user-activities  // User activity logs

// Document Administration
GET    /api/admin/documents/stats  // Document statistics
POST   /api/admin/documents/cleanup // Cleanup old files
GET    /api/admin/storage-usage    // Storage usage statistics
```

## Frontend Structure

### Page Structure
```
src/app/
├── (auth)/
│   ├── login/
│   └── register/
├── dashboard/
│   ├── page.tsx
│   ├── documents/
│   ├── users/
│   ├── profile/
│   └── notifications/
├── documents/
│   ├── page.tsx              # Document list
│   ├── [id]/
│   │   ├── page.tsx         # Document detail
│   │   ├── view/            # PDF viewer
│   │   └── edit/            # Edit document
│   ├── upload/              # Upload new document
│   └── types/               # Document types management
├── admin/
│   ├── page.tsx
│   ├── users/
│   ├── groups/
│   ├── documents/
│   └── system/
└── api/
    ├── auth/
    ├── documents/
    ├── users/
    ├── admin/
    └── notifications/
```

### Key Components

#### 1. Document Components
```typescript
// DocumentList Component
interface DocumentListProps {
  filters: DocumentFilter;
  userRole: string;
  onDocumentSelect: (doc: Document) => void;
}

// DocumentViewer Component
interface DocumentViewerProps {
  document: Document;
  canDownload: boolean;
  canPrint: boolean;
  onView: (documentId: number) => void;
}

// DocumentUpload Component
interface DocumentUploadProps {
  allowedTypes: string[];
  maxFileSize: number;
  onUpload: (doc: DocumentUpload) => Promise<void>;
}
```

#### 2. Comment Components
```typescript
// CommentThread Component
interface CommentThreadProps {
  documentId: number;
  comments: Comment[];
  canComment: boolean;
  onAddComment: (content: string, parentId?: number) => void;
}
```

#### 3. Notification Components
```typescript
// NotificationCenter Component
interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}
```

## Security & Best Practices

### Security Implementation

#### 1. File Upload Security
```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function validateFile(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type) && 
         file.size <= MAX_FILE_SIZE;
}
```

#### 2. Access Control
```typescript
function checkDocumentAccess(user: User, document: Document): boolean {
  // Check if user's group has access to document type
  const documentType = document.type;
  const userGroup = user.group;
  const allowedGroups = AccessMatrix[documentType.slug];
  
  return allowedGroups.includes(userGroup.name);
}
```

#### 3. Audit Logging
```typescript
async function logDocumentActivity(
  documentId: number,
  userId: number,
  action: string,
  req: NextRequest
) {
  await prisma.documentActivity.create({
    data: {
      documentId,
      userId,
      action,
      ipAddress: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
      createdAt: new Date()
    }
  });
}
```

## Deployment & Configuration

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dsm"

# Authentication
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_EXPIRES_IN="30d"

# File Storage
UPLOAD_PATH="/var/uploads/dsm"
MAX_FILE_SIZE="52428800"  # 50MB
ALLOWED_FILE_TYPES="pdf,doc,docx,jpg,png"

# Email Configuration
SMTP_HOST="smtp.company.com"
SMTP_PORT="587"
SMTP_USER="dsm@company.com"
SMTP_PASS="email-password"

# Notification
WEBSOCKET_PORT="3001"
REDIS_URL="redis://localhost:6379"

# System
APP_NAME="Document Management System"
APP_URL="https://dsm.company.com"
ADMIN_EMAIL="admin@company.com"
```

### Docker Configuration
```yaml
version: '3.8'

services:
  dsm-app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/dsm
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dsm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Kesimpulan

Document Management System (DSM) ini menyediakan:

### Fitur Lengkap
- ✅ **Manajemen Dokumen Komprehensif** - Upload, kategorisasi, versioning
- ✅ **Role-Based Access Control** - 9 level akses dengan permissions granular
- ✅ **Document Viewer Terintegrasi** - PDF viewer dengan kontrol akses
- ✅ **Sistem Komentar Threading** - Kolaborasi dengan reply comments
- ✅ **Real-time Notifications** - WebSocket untuk notifikasi instant
- ✅ **Audit Trail Lengkap** - Logging semua aktivitas sistem
- ✅ **Workflow Approval** - Sistem persetujuan bertingkat
- ✅ **Security Implementation** - Upload validation, access control, audit logs

### Enterprise-Ready
- 🔒 **Security-First Design** - Comprehensive security measures
- 📊 **Scalable Architecture** - Designed for growth
- 🔄 **Real-time Updates** - WebSocket integration
- 📱 **Responsive Design** - Mobile-friendly interface
- 🚀 **Performance Optimized** - Efficient database queries and caching
- 📋 **Compliance Ready** - Audit trails and document retention
- 🔧 **Configurable** - Flexible role and permission system
- 📈 **Analytics Dashboard** - Comprehensive reporting and statistics

Sistem ini cocok untuk organisasi yang membutuhkan kontrol ketat terhadap dokumen, workflow approval yang jelas, dan kemampuan kolaborasi yang aman dan terkontrol.