# Unified RBAC System - Database-Driven Access Control

## 🎯 Konsep

Menyatukan pengaturan access control untuk:
1. **Navigation** (Sidebar Menu)
2. **Routing** (URL Protection)
3. **API Endpoints** (Backend Access)

Dalam satu sistem terpusat berbasis database.

---

## 📊 Database Schema (Tambahan)

### Tabel Baru: `resources`
Menyimpan semua resources yang perlu dikontrol aksesnya.

```sql
CREATE TABLE resources (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'navigation', 'route', 'api'
  path VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id VARCHAR(50),
  required_capability VARCHAR(100), -- Link to role_capabilities
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB, -- Extra config
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resources_type ON resources(type);
CREATE INDEX idx_resources_path ON resources(path);
CREATE INDEX idx_resources_parent ON resources(parent_id);
CREATE INDEX idx_resources_capability ON resources(required_capability);
```

### Tabel Existing yang Digunakan:
- ✅ `role_capabilities` - High-level capabilities
- ✅ `role_capability_assignments` - Role → Capability mapping
- ✅ `roles` - Role definitions
- ✅ `user_roles` - User → Role mapping

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                         DATABASE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐      ┌────────────────┐      ┌───────────┐  │
│  │  users   │──1:N─│  user_roles    │──N:1─│   roles   │  │
│  └──────────┘      └────────────────┘      └─────┬─────┘  │
│                                                    │         │
│                                                  1:N        │
│                                                    │         │
│                     ┌──────────────────────────────┘        │
│                     │                                        │
│              ┌──────▼────────────────────┐                  │
│              │ role_capability_          │                  │
│              │    assignments            │                  │
│              └──────┬────────────────────┘                  │
│                     │                                        │
│                   N:1                                       │
│                     │                                        │
│         ┌───────────▼──────────────┐                        │
│         │  role_capabilities       │                        │
│         │  - ADMIN_ACCESS          │                        │
│         │  - DOCUMENT_MANAGE       │                        │
│         │  - USER_MANAGE           │                        │
│         └───────────┬──────────────┘                        │
│                     │                                        │
│                   1:N                                       │
│                     │                                        │
│         ┌───────────▼──────────────┐                        │
│         │     resources            │                        │
│         │  - Navigation Items      │                        │
│         │  - Route Protections     │                        │
│         │  - API Endpoints         │                        │
│         └──────────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Query & Cache
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                  APPLICATION LAYER                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Unified Access Control Service          │    │
│  │  • getNavigationForUser(userId)                 │    │
│  │  • canAccessRoute(userId, path)                 │    │
│  │  • canAccessAPI(userId, endpoint)               │    │
│  │  • getUserCapabilities(userId)                  │    │
│  └─────────────┬───────────────────────────────────┘    │
│                │                                         │
│                │ Uses                                    │
│                │                                         │
│  ┌─────────────▼──────────────────┐                     │
│  │    Cache Layer (Redis)         │                     │
│  │  • User Capabilities           │                     │
│  │  • Resource Mappings           │                     │
│  │  • TTL: 5 minutes              │                     │
│  └────────────────────────────────┘                     │
│                                                           │
└───────────────────────────────────────────────────────────┘
                          │
                          │ Consumed by
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                      CONSUMERS                            │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Sidebar     │  │  Middleware  │  │  API Routes  │   │
│  │  Navigation  │  │  (Routing)   │  │  Protection  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 💾 Data Contoh

### Capabilities
```sql
INSERT INTO role_capabilities (id, name, description, category) VALUES
('cap_admin_full', 'ADMIN_ACCESS', 'Full admin panel access', 'system'),
('cap_user_manage', 'USER_MANAGE', 'User management access', 'admin'),
('cap_doc_manage', 'DOCUMENT_MANAGE', 'Document management', 'document'),
('cap_doc_view', 'DOCUMENT_VIEW', 'View documents', 'document'),
('cap_analytics', 'ANALYTICS_VIEW', 'View analytics', 'analytics');
```

### Resources (Navigation)
```sql
INSERT INTO resources (id, type, path, name, required_capability, parent_id, icon, sort_order) VALUES
-- Main Menu
('nav_dashboard', 'navigation', '/dashboard', 'Dashboard', NULL, NULL, 'Home', 1),
('nav_documents', 'navigation', '/documents', 'Documents', 'DOCUMENT_VIEW', NULL, 'FileText', 2),
('nav_admin', 'navigation', '/admin', 'Admin', 'ADMIN_ACCESS', NULL, 'Shield', 3),

-- Admin Submenu
('nav_admin_users', 'navigation', '/admin/users', 'User Management', 'USER_MANAGE', 'nav_admin', 'Users', 1),
('nav_admin_roles', 'navigation', '/admin/roles', 'Role Management', 'ADMIN_ACCESS', 'nav_admin', 'Shield', 2),
('nav_admin_settings', 'navigation', '/admin/settings', 'Settings', 'ADMIN_ACCESS', 'nav_admin', 'Settings', 3);
```

### Resources (Routes & API)
```sql
INSERT INTO resources (id, type, path, name, required_capability) VALUES
-- Routes
('route_admin', 'route', '/admin/*', 'Admin Routes', 'ADMIN_ACCESS'),
('route_documents', 'route', '/documents/*', 'Document Routes', 'DOCUMENT_VIEW'),

-- API Endpoints
('api_users_list', 'api', '/api/users', 'List Users API', 'USER_MANAGE'),
('api_users_create', 'api', '/api/users', 'Create User API', 'USER_MANAGE'),
('api_docs_list', 'api', '/api/documents', 'List Documents API', 'DOCUMENT_VIEW');
```

### Role Capability Assignments
```sql
-- Admin role gets all capabilities
INSERT INTO role_capability_assignments (role_id, capability_id) 
SELECT r.id, c.id 
FROM roles r, role_capabilities c 
WHERE r.name = 'admin';

-- PPD.pusat gets admin and document capabilities
INSERT INTO role_capability_assignments (role_id, capability_id)
SELECT r.id, c.id
FROM roles r, role_capabilities c
WHERE r.name = 'ppd.pusat' 
  AND c.name IN ('ADMIN_ACCESS', 'USER_MANAGE', 'DOCUMENT_MANAGE', 'DOCUMENT_VIEW');

-- PPD.unit gets limited capabilities
INSERT INTO role_capability_assignments (role_id, capability_id)
SELECT r.id, c.id
FROM roles r, role_capabilities c
WHERE r.name = 'ppd.unit'
  AND c.name IN ('USER_MANAGE', 'DOCUMENT_MANAGE', 'DOCUMENT_VIEW');
```

---

## 🔧 Implementation

### 1. Prisma Schema Update

```prisma
model Resource {
  id                 String   @id @db.VarChar(50)
  type               String   @db.VarChar(20) // 'navigation', 'route', 'api'
  path               String   @db.VarChar(255)
  name               String   @db.VarChar(100)
  description        String?
  parentId           String?  @map("parent_id") @db.VarChar(50)
  requiredCapability String?  @map("required_capability") @db.VarChar(100)
  icon               String?  @db.VarChar(50)
  sortOrder          Int      @default(0) @map("sort_order")
  isActive           Boolean  @default(true) @map("is_active")
  metadata           Json?
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  
  parent   Resource?  @relation("ResourceParent", fields: [parentId], references: [id])
  children Resource[] @relation("ResourceParent")

  @@index([type])
  @@index([path])
  @@index([parentId])
  @@index([requiredCapability])
  @@index([type, isActive])
  @@map("resources")
}
```

### 2. Unified Access Control Service

```typescript
// src/lib/unified-access-control.ts

import { prisma } from '@/lib/prisma'

interface UserCapabilities {
  capabilities: string[]
  roleLevel: number
}

interface ResourceAccess {
  id: string
  type: string
  path: string
  name: string
  icon?: string
  children?: ResourceAccess[]
}

export class UnifiedAccessControl {
  private cache = new Map<string, { data: any; expires: number }>()
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get user's capabilities from their roles
   */
  async getUserCapabilities(userId: string): Promise<UserCapabilities> {
    const cacheKey = `user_cap_${userId}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }

    const userRoles = await prisma.userRole.findMany({
      where: { userId, isActive: true },
      include: {
        role: {
          include: {
            capabilityAssignments: {
              include: {
                capability: true
              }
            }
          }
        }
      }
    })

    const capabilities = new Set<string>()
    let maxLevel = 0

    userRoles.forEach(ur => {
      if (ur.role.level > maxLevel) maxLevel = ur.role.level
      ur.role.capabilityAssignments.forEach(ca => {
        capabilities.add(ca.capability.name)
      })
    })

    const result = {
      capabilities: Array.from(capabilities),
      roleLevel: maxLevel
    }

    this.cache.set(cacheKey, {
      data: result,
      expires: Date.now() + this.CACHE_TTL
    })

    return result
  }

  /**
   * Get navigation items accessible by user
   */
  async getNavigationForUser(userId: string): Promise<ResourceAccess[]> {
    const userCaps = await this.getUserCapabilities(userId)
    
    const resources = await prisma.resource.findMany({
      where: {
        type: 'navigation',
        isActive: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    return this.filterAccessibleResources(resources, userCaps)
  }

  /**
   * Check if user can access a route
   */
  async canAccessRoute(userId: string, path: string): Promise<boolean> {
    const userCaps = await this.getUserCapabilities(userId)
    
    const resource = await prisma.resource.findFirst({
      where: {
        type: 'route',
        OR: [
          { path: path },
          { path: { contains: '*' } } // Pattern matching
        ],
        isActive: true
      }
    })

    if (!resource) return true // No restriction = public

    return this.hasRequiredCapability(userCaps, resource.requiredCapability)
  }

  /**
   * Check if user can access an API endpoint
   */
  async canAccessAPI(userId: string, endpoint: string, method: string): Promise<boolean> {
    const userCaps = await this.getUserCapabilities(userId)
    
    const resource = await prisma.resource.findFirst({
      where: {
        type: 'api',
        path: endpoint,
        isActive: true,
        metadata: {
          path: ['method'],
          equals: method
        }
      }
    })

    if (!resource) return true

    return this.hasRequiredCapability(userCaps, resource.requiredCapability)
  }

  /**
   * Filter resources based on user capabilities
   */
  private filterAccessibleResources(
    resources: any[],
    userCaps: UserCapabilities
  ): ResourceAccess[] {
    const result: ResourceAccess[] = []
    
    // Build hierarchy
    const resourceMap = new Map(resources.map(r => [r.id, r]))
    const rootResources = resources.filter(r => !r.parentId)

    for (const resource of rootResources) {
      if (this.hasRequiredCapability(userCaps, resource.requiredCapability)) {
        const item: ResourceAccess = {
          id: resource.id,
          type: resource.type,
          path: resource.path,
          name: resource.name,
          icon: resource.icon
        }

        // Add children
        const children = resources
          .filter(r => r.parentId === resource.id)
          .filter(r => this.hasRequiredCapability(userCaps, r.requiredCapability))
          .map(r => ({
            id: r.id,
            type: r.type,
            path: r.path,
            name: r.name,
            icon: r.icon
          }))

        if (children.length > 0) {
          item.children = children
        }

        result.push(item)
      }
    }

    return result
  }

  /**
   * Check if user has required capability
   */
  private hasRequiredCapability(
    userCaps: UserCapabilities,
    requiredCap?: string | null
  ): boolean {
    if (!requiredCap) return true // No requirement = accessible
    
    // Admin wildcard
    if (userCaps.capabilities.includes('*')) return true
    
    return userCaps.capabilities.includes(requiredCap)
  }

  /**
   * Clear cache for a user
   */
  clearUserCache(userId: string) {
    this.cache.delete(`user_cap_${userId}`)
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear()
  }
}

export const accessControl = new UnifiedAccessControl()
```

### 3. Usage Examples

#### In Sidebar Component
```typescript
// src/components/app-sidebar.tsx
import { accessControl } from '@/lib/unified-access-control'

export function AppSidebar() {
  const { data: session } = useSession()
  const [navigation, setNavigation] = useState([])

  useEffect(() => {
    if (session?.user?.id) {
      accessControl.getNavigationForUser(session.user.id)
        .then(setNavigation)
    }
  }, [session?.user?.id])

  return (
    <Sidebar>
      {navigation.map(item => (
        <SidebarMenuItem key={item.id}>
          <Link href={item.path}>{item.name}</Link>
          {item.children && (
            <SidebarSubMenu>
              {item.children.map(child => (
                <Link key={child.id} href={child.path}>{child.name}</Link>
              ))}
            </SidebarSubMenu>
          )}
        </SidebarMenuItem>
      ))}
    </Sidebar>
  )
}
```

#### In Middleware
```typescript
// src/middleware.ts
import { accessControl } from '@/lib/unified-access-control'

export async function middleware(request: NextRequest) {
  const session = await getToken({ req: request })
  
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const canAccess = await accessControl.canAccessRoute(
    session.user.id,
    request.nextUrl.pathname
  )

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.next()
}
```

#### In API Routes
```typescript
// src/app/api/users/route.ts
import { accessControl } from '@/lib/unified-access-control'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  const canAccess = await accessControl.canAccessAPI(
    session.user.id,
    '/api/users',
    'GET'
  )

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // ... rest of API logic
}
```

---

## 🎁 Keuntungan Sistem Ini

### 1. **Centralized Management**
✅ Semua access control di satu tempat (database)
✅ Tidak perlu edit kode untuk ubah permission
✅ Admin bisa manage via UI

### 2. **Consistency**
✅ Navigation, routing, dan API menggunakan sistem yang sama
✅ Tidak ada duplicate logic
✅ Tidak ada konflik antara frontend dan backend

### 3. **Flexibility**
✅ Mudah menambah role baru
✅ Mudah menambah menu/route baru
✅ Capability-based = lebih granular daripada role-based

### 4. **Performance**
✅ Caching layer untuk mengurangi DB queries
✅ Hierarchy building di memory
✅ Dapat di-scale dengan Redis

### 5. **Audit & Tracking**
✅ Semua perubahan permission tercatat di database
✅ Mudah tracking "siapa punya akses apa"
✅ Compliance-ready

---

## 📝 Migration Path

### Step 1: Setup Database
```bash
# Create migration
npx prisma migrate dev --name add_resources_table

# Seed data
npx prisma db seed
```

### Step 2: Implement Service
```bash
# Create unified access control
touch src/lib/unified-access-control.ts
```

### Step 3: Update Components
```bash
# Update sidebar to use new system
# Update middleware to use new system
# Update API routes to use new system
```

### Step 4: Create Admin UI
```bash
# Build UI for managing resources
# Build UI for assigning capabilities
```

### Step 5: Deprecate Old System
```bash
# Remove hardcoded requiredRoles
# Remove protectedRoutes map
# Keep only as fallback
```

---

## 🚀 Next Steps

1. **Immediate**: Tambahkan tabel `resources` ke Prisma schema
2. **Short-term**: Implement UnifiedAccessControl service
3. **Medium-term**: Migrate navigation.ts ke database
4. **Long-term**: Build admin UI untuk manage resources

Apakah Anda ingin saya implementasikan sistem ini sekarang?
