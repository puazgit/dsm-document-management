# Sidebar Tidak Muncul - Troubleshooting Guide

## 🐛 Masalah
User admin@dsm.com tidak dapat melihat sidebar navigation.

## 🔍 Root Cause
Database tidak memiliki navigation resources yang diperlukan untuk menampilkan sidebar items.

## ✅ Solusi

### 1. Seed Navigation Resources
```bash
npx tsx prisma/seeds/resources.ts
```

Output yang diharapkan:
```
✅ Seeded 47 resources
   - Navigation: 12
   - Routes: 12
   - APIs: 23
```

### 2. Clear Cache & Restart
```bash
# Clear navigation cache
npx tsx scripts/clear-navigation-cache.ts

# Restart development server
# Ctrl+C to stop, then:
npm run dev
```

### 3. Clear Browser Cache
- Hard refresh: `Ctrl/Cmd + Shift + R`
- Or logout dan login kembali

## 🧪 Verification

### Check Database
```bash
npx tsx << 'EOF'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const count = await prisma.resource.count({
    where: { type: 'navigation', isActive: true }
  })
  console.log('Navigation resources:', count)
  await prisma.$disconnect()
}
check()
EOF
```

Expected output: `Navigation resources: 12`

### Check User Capabilities
```bash
npx tsx << 'EOF'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@dsm.com' },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              capabilityAssignments: {
                include: { capability: true }
              }
            }
          }
        }
      }
    }
  })
  
  const caps = new Set()
  user?.userRoles.forEach(ur => {
    ur.role.capabilityAssignments.forEach(ca => {
      caps.add(ca.capability.name)
    })
  })
  
  console.log('User:', user?.email)
  console.log('Capabilities:', caps.size)
  await prisma.$disconnect()
}
checkUser()
EOF
```

## 📊 Expected Sidebar Items

Admin user should see:
1. 📊 Dashboard
2. 📄 Documents
   - All Documents
   - Create Document
3. 🔧 Admin
   - User Management
   - Role Management
   - Permission Management
   - Organizations
   - Audit Logs
4. 📈 Analytics
5. 👤 Profile

Total: 12 navigation items

## 🔧 Code Changes Made

### 1. Enhanced Cache Handling
- Added cache busting to API fetch
- Added no-cache headers to API response
- Force fresh data on every load

### 2. Added Debugging Logs
- API endpoint logs user email and item count
- Hook logs fetched navigation count
- Sidebar component logs session and navigation state

### 3. Input Validation
- Validate localStorage data types
- Sanitize role display to prevent info leakage
- Add capability guards to admin menu items

## 🔐 Security Improvements

1. ✅ Protected admin menu items with CapabilityGuard
2. ✅ Validated localStorage input to prevent XSS
3. ✅ Sanitized role display
4. ✅ Added proper error handling

## 🚀 Monitoring

Check browser console for debug logs:
```
[useUnifiedNavigation] Fetched navigation items: 12
[AppSidebarUnified] Session: admin@dsm.com
[AppSidebarUnified] Navigation items: 12
```

Check server logs:
```
[API /navigation] Fetching navigation for user: admin@dsm.com
[API /navigation] Returning 12 items
```

## 🔄 Prevention

To prevent this issue in future deployments:

1. **Always seed resources after schema changes:**
   ```bash
   npx prisma migrate deploy
   npx tsx prisma/seeds/resources.ts
   ```

2. **Include in deployment checklist:**
   - [ ] Run migrations
   - [ ] Seed resources
   - [ ] Verify navigation API returns data
   - [ ] Clear application cache

3. **Add health check:**
   ```typescript
   // GET /api/health
   const navCount = await prisma.resource.count({
     where: { type: 'navigation' }
   })
   if (navCount === 0) {
     return { status: 'warning', message: 'No navigation resources' }
   }
   ```

## 📝 Related Files

- `/src/components/app-sidebar-unified.tsx` - Sidebar component
- `/src/hooks/use-unified-navigation.ts` - Navigation hook
- `/src/app/api/navigation/route.ts` - Navigation API
- `/src/lib/unified-access-control.ts` - Access control logic
- `/prisma/seeds/resources.ts` - Navigation seed data
- `/scripts/clear-navigation-cache.ts` - Cache cleanup utility

## ✅ Resolution Status

- [x] Identified root cause: Missing navigation resources
- [x] Seeded navigation resources to database
- [x] Added cache busting to prevent stale data
- [x] Added debugging logs for troubleshooting
- [x] Enhanced security with capability guards
- [x] Created utility scripts for maintenance
- [x] Documented solution for future reference

**Status**: ✅ RESOLVED

**Date**: January 2, 2026

**Verified**: Admin user can now see all 12 navigation items in sidebar.
