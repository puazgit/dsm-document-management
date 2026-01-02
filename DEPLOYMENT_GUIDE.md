# Deployment Guide - Capability-Based Authorization System

**System Version:** 2.0  
**Last Updated:** January 1, 2026  
**Migration Status:** ✅ Complete (100% API routes migrated)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migration](#database-migration)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### 1. Code Review

- [ ] All API routes migrated to `requireCapability()`
- [ ] All components using `useCapabilities()` hook
- [ ] No hardcoded role checks remaining
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] All tests passing (`npm run test`)

### 2. Database Backup

```bash
# Create full database backup
pg_dump -h localhost -U postgres -d dsmt_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### 3. Dependency Verification

```bash
# Verify all dependencies installed
npm ci

# Check for security vulnerabilities
npm audit

# Update if needed
npm audit fix
```

### 4. Environment Variables

Ensure these are set in production:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<generated-secret>"

# API Keys (if any)
# ...
```

---

## Database Migration

### Step 1: Review Migration Files

```bash
# List all pending migrations
npx prisma migrate status
```

Expected output:
```
✓ Migrations applied:
  - 20250101_add_role_capabilities
  - 20250101_add_role_capability_assignments
  - 20250101_seed_initial_capabilities
```

### Step 2: Run Migrations

#### Development/Staging

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed capabilities (if not already seeded)
npx ts-node prisma/seeds/seed-capabilities.ts
```

#### Production

```bash
# Set production database URL
export DATABASE_URL="postgresql://prod_user:password@prod_host:5432/prod_db"

# Run migrations with explicit confirmation
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Verify migration success
npx prisma migrate status
```

### Step 3: Seed Capabilities & Assignments

```typescript
// Run capability seed script
npx ts-node prisma/seeds/seed-capabilities.ts

// Verify capabilities created
npx prisma studio
// Check role_capabilities table (should have 26+ capabilities)
// Check role_capability_assignments table (should have assignments)
```

### Expected Database State After Migration

**role_capabilities table:**
- 26 capabilities total
- Categories: document (11), user (5), role (2), admin (1), group (3), system (4)

**role_capability_assignments table:**
- Admin role: All capabilities
- Manager role: DOCUMENT_*, USER_VIEW, GROUP_*
- Editor role: DOCUMENT_VIEW, DOCUMENT_EDIT, DOCUMENT_CREATE
- Viewer role: DOCUMENT_VIEW

---

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://prod_user:strong_password@db.prod.com:5432/dsmt_prod"

# NextAuth Configuration
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="<use: openssl rand -base64 32>"

# Session Configuration
# JWT expires after 30 days, refresh every 60 seconds
SESSION_MAX_AGE=2592000
SESSION_UPDATE_AGE=60

# Logging
LOG_LEVEL=info

# Feature Flags (optional)
ENABLE_CAPABILITY_LOGGING=true
STRICT_CAPABILITY_CHECK=true
```

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Store securely (use environment variable manager)
```

### Docker Configuration

If using Docker:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=dsmt_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=dsmt_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## Deployment Steps

### Option 1: Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# https://vercel.com/your-project/settings/environment-variables
```

### Option 2: Docker Deployment

```bash
# Build image
docker build -t dsmt-app:latest -f Dockerfile .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

### Option 3: PM2 (Node.js Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "dsmt-app" -- start

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

### Option 4: Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dsmt-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dsmt-app
  template:
    metadata:
      labels:
        app: dsmt-app
    spec:
      containers:
      - name: dsmt-app
        image: your-registry/dsmt-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dsmt-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: dsmt-secrets
              key: nextauth-secret
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check application health
curl https://yourdomain.com/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### 2. Capability System Verification

#### Test Authentication

```bash
# Login as admin user
curl -X POST https://yourdomain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Check session includes capabilities
# Should return user object with "capabilities": ["DOCUMENT_VIEW", "DOCUMENT_EDIT", ...]
```

#### Test API Authorization

```bash
# Test protected endpoint (should return 200 with valid capability)
curl https://yourdomain.com/api/documents \
  -H "Cookie: next-auth.session-token=<token>"

# Test without capability (should return 403)
curl https://yourdomain.com/api/admin/users \
  -H "Cookie: next-auth.session-token=<limited-user-token>"
```

### 3. Database Verification

```sql
-- Check capability count
SELECT COUNT(*) FROM role_capabilities;
-- Expected: 26

-- Check assignments
SELECT 
  r.name AS role_name,
  COUNT(rca.capability_id) AS capability_count
FROM roles r
LEFT JOIN role_capability_assignments rca ON rca.role_id = r.id
GROUP BY r.name;
-- Expected:
-- admin: 26
-- manager: ~15
-- editor: ~5
-- viewer: 1

-- Verify users have roles
SELECT 
  u.name,
  u.email,
  r.name AS role_name
FROM users u
LEFT JOIN roles r ON r.id = u.role_id;
```

### 4. Performance Testing

```bash
# Install k6 (load testing tool)
brew install k6  # macOS
# or: apt install k6  # Linux

# Run load test
k6 run load-test.js
```

Example load test:
```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 10,  // 10 virtual users
  duration: '30s',
};

export default function () {
  let res = http.get('https://yourdomain.com/api/documents');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

### 5. Navigation & UI Verification

Manual checks:

- [ ] Login as **viewer** - should only see Documents tab
- [ ] Login as **editor** - should see Documents + edit buttons
- [ ] Login as **manager** - should see Documents + Users (view only)
- [ ] Login as **admin** - should see all navigation items

---

## Rollback Procedures

### If Deployment Fails

#### 1. Quick Rollback (Code)

```bash
# Revert to previous deployment
vercel rollback  # For Vercel

# OR for Docker
docker-compose down
docker-compose -f docker-compose.old.yml up -d

# OR for PM2
pm2 stop dsmt-app
pm2 delete dsmt-app
pm2 start npm --name "dsmt-app-old" -- start
```

#### 2. Database Rollback

```bash
# Restore from backup
psql -h localhost -U postgres -d dsmt_db < backup_20250101_120000.sql

# Verify restoration
psql -h localhost -U postgres -d dsmt_db -c "SELECT COUNT(*) FROM role_capabilities;"
```

#### 3. Verify Rollback Success

```bash
# Check application responds
curl https://yourdomain.com/api/health

# Check database state
npx prisma studio
```

### If Migration Partially Fails

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>

# Fix migration file
# Re-run migration
npx prisma migrate deploy
```

---

## Monitoring & Maintenance

### 1. Application Monitoring

#### Logs to Monitor

```bash
# Application logs
tail -f logs/app.log

# Watch for errors
grep "ERROR" logs/app.log | tail -50

# Capability check failures
grep "Capability check failed" logs/app.log
```

#### Key Metrics

- **Response Time:** API routes should respond < 200ms
- **Error Rate:** < 0.1% of requests
- **Session Creation:** Successful JWT generation with capabilities
- **Database Query Time:** Capability queries < 5ms

### 2. Database Monitoring

```sql
-- Monitor slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor connection pool
SELECT 
  count(*) AS connections,
  state
FROM pg_stat_activity
GROUP BY state;
```

### 3. Periodic Maintenance

#### Weekly

- [ ] Review error logs for patterns
- [ ] Check disk space (`df -h`)
- [ ] Verify backup integrity

#### Monthly

- [ ] Database vacuum and analyze
  ```sql
  VACUUM ANALYZE;
  ```
- [ ] Review slow query log
- [ ] Update dependencies (`npm update`)
- [ ] Security audit (`npm audit`)

#### Quarterly

- [ ] Performance review (load testing)
- [ ] Capability audit (unused capabilities?)
- [ ] User role review (permissions still appropriate?)
- [ ] Database index optimization

---

## Troubleshooting Common Issues

### Issue: Users can't access features they should have

**Diagnosis:**
```typescript
// Check user session in API route
const session = await getServerSession(authOptions)
console.log('User capabilities:', session?.user?.capabilities)
```

**Solution:**
1. Verify role has capability in database
2. User may need to logout/login (JWT refresh)
3. Check JWT token expiry settings

### Issue: API returns 403 for all users

**Diagnosis:**
```typescript
// Check capability check in API route
const auth = await requireCapability(request, 'DOCUMENT_VIEW')
console.log('Auth result:', auth)
```

**Solution:**
1. Verify capability exists in `role_capabilities` table
2. Check spelling of capability name (case-sensitive)
3. Ensure user has role assigned

### Issue: High response times

**Diagnosis:**
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT rc.name
FROM role_capability_assignments rca
JOIN role_capabilities rc ON rc.id = rca.capability_id
WHERE rca.role_id = 'user-role-id';
```

**Solution:**
1. Add indexes if missing
2. Verify database connection pool settings
3. Check for N+1 queries

### Issue: Capabilities not loading in session

**Diagnosis:**
```typescript
// Check NextAuth jwt callback
// src/lib/auth.ts
jwt: async ({ token, user }) => {
  console.log('JWT callback - user:', user)
  console.log('JWT callback - token:', token)
  // ...
}
```

**Solution:**
1. Verify `jwt` callback in authOptions
2. Check database query for capabilities
3. Ensure role has capabilities assigned

---

## Security Considerations

### 1. JWT Security

- ✅ Use strong `NEXTAUTH_SECRET` (32+ characters)
- ✅ Set appropriate token expiry (30 days max)
- ✅ Use HTTPS in production
- ✅ Implement token refresh (every 60 seconds)

### 2. Database Security

- ✅ Use parameterized queries (Prisma ORM)
- ✅ Limit database user permissions
- ✅ Enable database SSL/TLS
- ✅ Regular backups (daily minimum)

### 3. API Security

- ✅ Always validate capabilities on server-side
- ✅ Never trust client-side capability checks alone
- ✅ Rate limit API endpoints
- ✅ Log unauthorized access attempts

### 4. Environment Variables

- ✅ Never commit `.env` files
- ✅ Use environment variable managers (Vercel, AWS Secrets Manager)
- ✅ Rotate secrets regularly (quarterly)

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for fast capability lookups
CREATE INDEX idx_role_capability_assignments_role 
ON role_capability_assignments(role_id);

CREATE INDEX idx_role_capability_assignments_capability 
ON role_capability_assignments(capability_id);

CREATE INDEX idx_role_capabilities_name 
ON role_capabilities(name);
```

### 2. Caching Strategy

```typescript
// Example: Redis caching for capabilities (optional)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
})

async function getUserCapabilities(userId: string) {
  // Check cache first
  const cached = await redis.get(`capabilities:${userId}`)
  if (cached) return cached
  
  // Fetch from database
  const capabilities = await fetchFromDatabase(userId)
  
  // Cache for 1 hour
  await redis.set(`capabilities:${userId}`, capabilities, { ex: 3600 })
  
  return capabilities
}
```

### 3. Next.js Optimization

```javascript
// next.config.js
module.exports = {
  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,
  
  // Optimize images
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Enable compression
  compress: true,
  
  // Reduce bundle size
  webpack: (config) => {
    config.optimization.minimize = true
    return config
  }
}
```

---

## Resources

- [Capability System README](CAPABILITY_SYSTEM_README.md)
- [Phase 4 Testing Results](PHASE_4_TESTING_RESULTS.md)
- [Unified RBAC System Documentation](docs/UNIFIED_RBAC_SYSTEM.md)

---

**Deployment completed successfully?** ✅  
**All tests passing?** ✅  
**Database migrated?** ✅  
**Monitoring setup?** ✅

**🎉 You're ready for production!**
