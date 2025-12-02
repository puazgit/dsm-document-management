# DSM Permission Management & URL Routes

## 🔐 Permission Management System Overview

### Core Permission Categories

| **Category** | **Module** | **Actions** | **Resources** | **Description** |
|--------------|------------|-------------|---------------|-----------------|
| **Documents** | documents | create, read, update, delete, approve, upload, download | all, own, department | Document management permissions |
| **PDF Security** | pdf | view, download, print, copy, watermark | all | PDF-specific security controls |
| **Users** | users | create, read, update, delete, profile | all, own | User management permissions |
| **Document Types** | document-types | create, read, update, delete | all | Document type configuration |
| **Comments** | comments | create, read, update, delete, moderate | all, own | Comment system permissions |
| **Roles** | roles | create, read, update, delete, assign | all | Role management permissions |
| **System** | system | admin, settings, logs, analytics | all | System administration |

---

## 📊 Role-Based Permission Matrix

### Organizational Roles

| **Role** | **Level** | **Documents** | **PDF** | **Users** | **Admin** | **Key Permissions** |
|----------|-----------|---------------|---------|-----------|-----------|-------------------|
| **org_dirut** (Direktur Utama) | 10 | ✅ Full CRUD + Approve | ✅ All PDF Actions | ✅ Full User Mgmt | ✅ System Config | Highest authority, full access |
| **org_dewas** (Dewan Pengawas) | 9 | ✅ Read Only | ✅ Download + Print | ✅ Read Users | ❌ | Oversight, read-only access |
| **org_ppd** (PPD) | 9 | ✅ Full CRUD + Approve | ✅ All PDF Actions | ✅ Read Users | ❌ | Process documentation lead |
| **org_administrator** | 10 | ✅ Full CRUD + Approve | ✅ All PDF Actions | ✅ Full User Mgmt | ✅ System Config | Technical administration |
| **org_komite_audit** | 8 | ✅ Read Only | ✅ All PDF Actions | ✅ Read Users | ❌ | Audit and compliance |
| **org_kadiv** (Kepala Divisi) | 8 | ✅ Full CRUD + Approve | ✅ All PDF Actions | ✅ Read Users | ❌ | Division leadership |
| **org_gm** (General Manager) | 7 | ✅ CRUD + Approve | ✅ All PDF Actions | ✅ Read + Update | ✅ Admin Access | Management level |
| **org_finance** | 7 | ✅ CRUD + Approve | ✅ All PDF Actions | ✅ Read Users | ❌ | Financial documents |
| **org_manager** | 6 | ✅ CRUD + Approve | ✅ All PDF Actions | ✅ Read Users | ❌ | Department management |
| **org_hrd** | 6 | ✅ CRUD + Approve | ✅ All PDF Actions | ✅ Full User Mgmt | ❌ | Human resources |
| **org_supervisor** | 5 | ✅ CRUD | ✅ All PDF Actions | ✅ Read Users | ❌ | Team supervision |
| **org_sekretaris** | 4 | ✅ CRUD | ✅ All PDF Actions | ✅ Read Users | ❌ | Administrative support |
| **org_staff** | 3 | ✅ Create + Read | ❌ View Only | ❌ | ❌ | Basic staff access |
| **org_guest** | 1 | ✅ Read Only | ❌ View Only | ❌ | ❌ | Guest/visitor access |

### System Roles

| **Role** | **Level** | **Documents** | **PDF** | **Users** | **Admin** | **Key Permissions** |
|----------|-----------|---------------|---------|-----------|-----------|-------------------|
| **admin** | 100 | ✅ Full Access | ✅ All + Watermark | ✅ Full CRUD | ✅ Full System | Super administrator |
| **editor** | 50 | ✅ Full CRUD + Approve | ✅ Download + View | ✅ Profile Only | ❌ | Content management |
| **viewer** | 10 | ✅ Read + Own | ✅ Download + View | ✅ Read + Profile | ❌ | Limited access |

---

## 🚀 URL Routes & Access Control

### Public Routes (No Authentication Required)

| **Route** | **Description** | **Access Level** |
|-----------|-----------------|------------------|
| `/` | Landing page | Public |
| `/auth/signin` | Login page | Public |
| `/auth/signup` | Registration page | Public |
| `/auth/error` | Auth error page | Public |

### Protected Routes (Authentication Required)

#### Dashboard & Navigation
| **Route** | **Required Permission** | **Minimum Role** | **Description** |
|-----------|------------------------|------------------|-----------------|
| `/dashboard` | `documents.read` | org_guest | Main dashboard |
| `/profile` | `users.profile` | org_staff | User profile management |

#### Document Management
| **Route** | **Required Permission** | **Minimum Role** | **Description** |
|-----------|------------------------|------------------|-----------------|
| `/documents` | `documents.read` | org_guest | Document listing |
| `/documents/upload` | `documents.upload` | org_staff | Document upload |
| `/documents/[id]` | `documents.read` | org_guest | Document details |
| `/documents/[id]/edit` | `documents.update` OR `documents.update.own` | org_staff | Edit document |
| `/documents/[id]/download` | `documents.download` OR `pdf.download` | org_sekretaris | Download document |

#### User Management
| **Route** | **Required Permission** | **Minimum Role** | **Description** |
|-----------|------------------------|------------------|-----------------|
| `/users` | `users.read` | org_supervisor | User listing |
| `/users/create` | `users.create` | org_hrd | Create new user |
| `/users/[id]` | `users.read` | org_supervisor | User details |
| `/users/[id]/edit` | `users.update` | org_hrd | Edit user |

#### Administrative Routes
| **Route** | **Required Permission** | **Minimum Role** | **Description** |
|-----------|------------------------|------------------|-----------------|
| `/admin` | `admin.access` | org_administrator | Admin dashboard |
| `/admin/roles` | `roles.read` | org_administrator | Role management |
| `/admin/permissions` | `roles.assign` | org_administrator | Permission assignment |
| `/admin/system` | `system.admin` | org_dirut | System configuration |
| `/admin/logs` | `system.logs` | org_administrator | System logs |
| `/admin/analytics` | `system.analytics` | org_gm | Analytics dashboard |

#### PDF & Document Security
| **Route** | **Required Permission** | **Minimum Role** | **Description** |
|-----------|------------------------|------------------|-----------------|
| `/pdf-demo` | `pdf.view` | org_staff | PDF viewer demo |
| `/test-ui` | `documents.read` | org_staff | UI testing page |

---

## 🔑 API Routes & Permissions

### Authentication API
| **Endpoint** | **Method** | **Permission** | **Description** |
|-------------|------------|----------------|-----------------|
| `/api/auth/signin` | POST | None | User login |
| `/api/auth/signout` | POST | None | User logout |
| `/api/auth/session` | GET | None | Get current session |

### Document API
| **Endpoint** | **Method** | **Permission** | **Description** |
|-------------|------------|----------------|-----------------|
| `/api/documents` | GET | `documents.read` | List documents |
| `/api/documents` | POST | `documents.create` | Create document |
| `/api/documents/[id]` | GET | `documents.read` | Get document |
| `/api/documents/[id]` | PUT | `documents.update` | Update document |
| `/api/documents/[id]` | DELETE | `documents.delete` | Delete document |
| `/api/documents/[id]/download` | GET | `documents.download` OR `pdf.download` | Download document |
| `/api/documents/[id]/approve` | POST | `documents.approve` | Approve document |
| `/api/documents/stats` | GET | `documents.read` | Document statistics |

### User Management API
| **Endpoint** | **Method** | **Permission** | **Description** |
|-------------|------------|----------------|-----------------|
| `/api/users` | GET | `users.read` | List users |
| `/api/users` | POST | `users.create` | Create user |
| `/api/users/[id]` | GET | `users.read` | Get user |
| `/api/users/[id]` | PUT | `users.update` | Update user |
| `/api/users/[id]` | DELETE | `users.delete` | Delete user |

### Document Types API
| **Endpoint** | **Method** | **Permission** | **Description** |
|-------------|------------|----------------|-----------------|
| `/api/document-types` | GET | `document-types.read` | List document types |
| `/api/document-types` | POST | `document-types.create` | Create document type |
| `/api/document-types/[id]` | PUT | `document-types.update` | Update document type |
| `/api/document-types/[id]` | DELETE | `document-types.delete` | Delete document type |

---

## 🛡️ Permission Enforcement Flow

### 1. Authentication Check
```
User Request → Middleware → Session Check → Role Verification
```

### 2. Authorization Matrix
```
Route Access → Required Permission → User Role → Permission Check → Allow/Deny
```

### 3. Resource-Level Security
```
Document Access → Owner Check → Group Access → Public Check → Permission Granted
```

---

## 🔧 Current User Credentials

| **Email** | **Password** | **Role** | **Status** | **PDF Download** |
|-----------|--------------|----------|------------|------------------|
| admin@dsm.com | admin123 | org_administrator | ✅ Active | ✅ Enabled |
| kadiv@dsm.com | [Reset Required] | org_kadiv | ✅ Active | ✅ Enabled |
| manager@dsm.com | [Reset Required] | org_manager | ✅ Active | ✅ Enabled |
| ppd@dsm.com | [Reset Required] | org_ppd | ✅ Active | ✅ Enabled |
| viewer@dsm.com | [Reset Required] | viewer | ✅ Active | ✅ Enabled |
| member@dsm.com | [Reset Required] | editor | ✅ Active | ✅ Enabled |

---

## 🚨 Security Notes

- All PDF download permissions have been added to organizational roles
- Session-based permission checking is implemented
- Fallback permissions exist for backward compatibility
- User passwords (except admin) need to be reset for testing
- NextAuth JWT tokens contain user permissions for client-side checks