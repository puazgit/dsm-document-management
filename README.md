# Document Management System (DSM)

![DSM Logo](./docs/logo.png)

A comprehensive, enterprise-grade document management system built with **Next.js 14**, **TypeScript**, **Prisma**, and **PostgreSQL**. Features role-based access control, real-time collaboration, document versioning, and advanced security measures.

## 🚀 Features

### 📄 Document Management
- **Multi-format Support** - PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images
- **Document Categories** - 7 predefined categories with access control
- **Version Control** - Full document versioning and history tracking
- **Advanced Search** - Full-text search with filters and tags
- **Bulk Operations** - Upload, download, and manage multiple documents

### 👥 User Management & Security
- **✨ Capability-Based Authorization** - 26 fine-grained capabilities (NEW!)
- **Database-Driven RBAC** - No hardcoded role checks, fully configurable
- **JWT Authentication** - Secure token-based authentication with capabilities
- **Session Management** - Multi-device session control with capability caching
- **Audit Trails** - Complete activity logging and monitoring
- **Performance** - 2ms capability queries, 10x faster than target

### 🔄 Collaboration Features
- **Threading Comments** - Nested comment system for document discussions
- **Real-time Notifications** - WebSocket-powered instant notifications
- **Document Sharing** - Controlled document access and sharing
- **Approval Workflows** - Multi-level document approval process

### 🔍 Document Viewer
- **Integrated PDF Viewer** - Built-in PDF viewing with controls
- **Capability-based Access** - Download/print restrictions based on user capabilities
- **Watermarking** - Optional document watermarking
- **View Tracking** - Document access analytics

### ⚡ Performance & Scalability
- **Optimistic Updates** - Enhanced user experience
- **Caching Strategy** - Redis caching for improved performance
- **Database Optimization** - Indexed queries and connection pooling
- **File Storage** - Local or cloud storage options

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL with optimized schema
- **Authentication**: NextAuth.js with JWT
- **UI Components**: Shadcn/ui with Radix UI primitives
- **Real-time**: WebSocket integration
- **File Storage**: Local filesystem or cloud storage
- **Caching**: Redis for session and data caching

### User Roles & Capabilities

| Role | Level | Access Description |
|------|-------|-------------------|
| **Administrator** | 10 | Full system access and configuration |
| **PPD** (Document Controller) | 9 | Document management and approval |
| **Kadiv** (Division Head) | 8 | Division-level document approval |
| **GM** (General Manager) | 7 | High-level document access |
| **Manager** | 6 | Management-level access |
| **Dirut** (Director) | 5 | Executive document access |
| **Dewas** (Board of Supervisors) | 4 | Board-level oversight |
| **Komite Audit** (Audit Committee) | 3 | Audit and review access |
| **Members** | 1 | Basic document access |

### Document Categories

1. **Panduan Sistem Manajemen** - Management system guides (Level 8+ access)
2. **Prosedur** - Standard operating procedures (Level 6+ access)
3. **Instruksi Kerja Bersifat Khusus** - Department-specific work instructions (Level 5+ access)
4. **Instruksi Kerja Bersifat Umum** - General work instructions (Level 3+ access)
5. **Dokumen Internal** - Internal company documents (Level 4+ access)
6. **Dokumen Eksternal** - External documents (Level 2+ access)
7. **Dokumen Eksternal SMK3** - External SMK3 documents (Level 6+ access)

## 🛠️ Installation

### Prerequisites
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 13.0
- **Redis** (optional, for caching)
- **npm** >= 8.0.0

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/dsm-system.git
   cd dsm-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb dsm_db
   
   # Run migrations
   npm run db:migrate
   
   # Seed the database
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Use default credentials (see Database Seeding section)

### Docker Setup

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Run database migrations**
   ```bash
   docker-compose exec app npm run db:migrate
   docker-compose exec app npm run db:seed
   ```

## 📊 Database Schema

The system uses a comprehensive PostgreSQL schema with the following main entities:

- **Users & Groups** - User management and role-based access
- **Documents & Document Types** - Document storage and categorization
- **Comments** - Threading comment system for collaboration
- **Notifications** - Real-time notification system
- **Activities** - Comprehensive audit trails
- **System Configuration** - Dynamic system settings

### Database Seeding

The seed script creates:
- **9 user groups** with role configurations
- **27 role capabilities** for fine-grained access control
- **7 document types** with access controls
- **5 sample divisions** for organizational structure
- **5 default users** with different roles
- **System menu** and configuration

**Default Login Credentials:**
- Admin: `admin@dsm.com` / `admin123`
- PPD: `ppd@dsm.com` / `ppd123`
- Kadiv: `kadiv@dsm.com` / `kadiv123`
- Manager: `manager@dsm.com` / `manager123`
- Member: `member@dsm.com` / `member123`

## 🚦 API Routes

### Authentication
```
POST /api/auth/login      - User login
POST /api/auth/logout     - User logout
GET  /api/auth/me         - Get current user
POST /api/auth/refresh    - Refresh JWT token
```

### Documents
```
GET    /api/documents              - List documents with filters
POST   /api/documents              - Upload new document
GET    /api/documents/[id]         - Get document details
PUT    /api/documents/[id]         - Update document
DELETE /api/documents/[id]         - Delete document
GET    /api/documents/[id]/download - Download document file
POST   /api/documents/[id]/approve - Approve document
```

### Users & Administration
```
GET    /api/users                 - List users
POST   /api/users                 - Create user
PUT    /api/users/[id]            - Update user
GET    /api/admin/dashboard       - Admin dashboard data
GET    /api/admin/audit-logs      - System audit logs
```

## 🎨 UI Components

Built with **Shadcn/ui** and **Radix UI** primitives:

### Core Components
- **DataTable** - Advanced table with sorting, filtering, pagination
- **DocumentViewer** - PDF viewer with capability-based controls
- **CommentThread** - Nested comment system
- **NotificationCenter** - Real-time notifications
- **UploadDropzone** - Drag-and-drop file upload
- **UserRoleBadge** - Visual role indicators

### Layout Components
- **Sidebar** - Collapsible navigation sidebar
- **Header** - Top navigation with user menu
- **Breadcrumbs** - Dynamic navigation breadcrumbs
- **SearchBar** - Global document search

## 🔒 Security & Authorization

### ✨ Capability-Based Authorization System (v2.0)

The system uses a **database-driven capability-based authorization** model that eliminates hardcoded role checks. Authorization is based on **capabilities** (e.g., `DOCUMENT_EDIT`, `USER_MANAGE`) rather than role names.

**Key Features:**
- ✅ **26 fine-grained capabilities** across document, user, role, and system categories
- ✅ **7 predefined roles** with customizable capability assignments
- ✅ **2ms average query performance** (10x faster than target)
- ✅ **100% API coverage** - All 30 routes migrated to capability checks
- ✅ **Type-safe** - Full TypeScript support for capabilities
- ✅ **Cache-efficient** - Capabilities loaded once at login, stored in JWT

**Quick Example:**
```typescript
// Components (automatic UI rendering)
import { useCapabilities } from '@/hooks/use-capabilities'

function DocumentEditor() {
  const { canEditDocuments, canDeleteDocuments } = useCapabilities()
  
  return (
    <div>
      {canEditDocuments && <EditButton />}
      {canDeleteDocuments && <DeleteButton />}
    </div>
  )
}

// API Routes (authorization enforcement)
import { requireCapability } from '@/lib/rbac-helpers'

export async function POST(request: NextRequest) {
  const auth = await requireCapability(request, 'DOCUMENT_CREATE')
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  // User authorized, proceed...
}
```

📚 **Learn More:** See [CAPABILITY_SYSTEM_README.md](CAPABILITY_SYSTEM_README.md) for complete documentation.

### Authentication & Session Management
- **JWT-based Authentication** with refresh tokens
- **Session Management** with device tracking and capability caching
- **Password Policies** with strength validation

### Data Protection
- **Input Validation** with Zod schemas
- **SQL Injection Protection** via Prisma ORM
- **XSS Prevention** with Content Security Policy
- **CSRF Protection** with secure tokens
- **File Upload Security** with type validation

### Audit & Compliance
- **Complete Audit Trails** for all user actions
- **Document Access Logging** with IP tracking
- **Security Headers** for enhanced protection
- **Data Retention Policies** with automatic cleanup

## 📈 Performance Optimization

### Caching Strategy
- **Redis Caching** for session and frequently accessed data
- **Query Optimization** with database indexes
- **Image Optimization** with Next.js Image component
- **Bundle Optimization** with code splitting

### Database Optimization
- **Connection Pooling** for better resource management
- **Indexed Queries** for fast document searches
- **Pagination** for large dataset handling
- **Soft Deletes** for data retention and recovery

## 🧪 Testing

### Test Setup
```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Testing Stack
- **Jest** - Unit and integration testing
- **React Testing Library** - Component testing
- **Cypress** - End-to-end testing
- **MSW** - API mocking for tests

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Configuration
Set the following environment variables for production:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dsm_prod"

# Security
JWT_SECRET="your-production-jwt-secret"
NEXTAUTH_SECRET="your-production-nextauth-secret"

# File Storage
UPLOAD_PATH="/var/uploads/dsm"
MAX_FILE_SIZE="52428800"

# Email
SMTP_HOST="your-smtp-server"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-email-password"
```

### Docker Deployment
```bash
# Build production image
docker build -t dsm-system:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Documentation

### Core Documentation
- **[Capability System README](CAPABILITY_SYSTEM_README.md)** - Complete authorization guide
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment steps
- **[Phase 4 Testing Results](PHASE_4_TESTING_RESULTS.md)** - Testing coverage and validation

### System Documentation
- **[Unified RBAC System](docs/UNIFIED_RBAC_SYSTEM.md)** - RBAC architecture overview
- **[Migration Guide](docs/UNIFIED_RBAC_MIGRATION_GUIDE.md)** - Migration from v1 to v2
- **[Quick Reference](docs/UNIFIED_RBAC_QUICK_REFERENCE.md)** - API and hook reference

### Admin & User Guides
- **[Admin RBAC UI Guide](docs/ADMIN_RBAC_UI_GUIDE.md)** - Role and capability management
- **API Documentation** - Available at `/api/docs` (Swagger/OpenAPI)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style (ESLint + Prettier)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Documentation**: Check the docs folder
- **Issues**: Create a GitHub issue
- **Email**: support@dsm-system.com

## 🎯 Roadmap

### Version 1.1
- [ ] Advanced workflow designer
- [ ] Document templates system
- [ ] Enhanced reporting dashboard
- [ ] Mobile application support

### Version 1.2
- [ ] AI-powered document classification
- [ ] Advanced search with OCR
- [ ] Integration with external systems
- [ ] Multi-tenant support

---

**Built with ❤️ for enterprise document management**