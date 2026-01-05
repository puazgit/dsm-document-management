# Database Schema Synchronization Guide

## Masalah Umum

Ketika melakukan migrasi database, sering terjadi ketidaksesuaian antara:
1. **Prisma Schema** (schema.prisma)
2. **Database Aktual** (PostgreSQL)
3. **Prisma Client** (generated code)
4. **Source Code** (TypeScript/API)

## Root Cause

- Manual SQL migrations tidak tercatat di Prisma
- Field dihapus/ditambah di database tapi tidak di schema
- Enum values berubah di database tapi tidak di schema
- Raw SQL queries menggunakan field yang sudah tidak ada

## Solusi: Workflow yang Benar

### 1. Setelah Manual SQL Migration

```bash
# Step 1: Introspect database untuk update schema.prisma
npx prisma db pull

# Step 2: Review perubahan di schema.prisma
git diff prisma/schema.prisma

# Step 3: Generate Prisma Client baru
npx prisma generate

# Step 4: Check TypeScript errors
npm run build
```

### 2. Sebelum Migrasi

```bash
# Backup dulu!
./scripts/backup-database.sh

# Atau manual:
docker exec dsm_postgres pg_dump -U postgres dsm_db > backup.sql
```

### 3. Safe Migration Process

**Option A: Prisma Migrate (Recommended)**
```bash
# 1. Ubah schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Apply to production
npx prisma migrate deploy
```

**Option B: Manual SQL (When Needed)**
```bash
# 1. Write SQL migration file
# 2. Test di dev environment
# 3. Run migration
cat migration.sql | docker exec -i dsm_postgres psql -U postgres -d dsm_db

# 4. IMPORTANT: Sync schema!
npx prisma db pull
npx prisma generate
```

## Current Issues & Fixes

### Issue 1: Column `is_public` Tidak Ada

**Location**: Likely in `/src/app/api/documents/stats/route.ts`

**Error**: 
```
column "is_public" does not exist
```

**Fix**: Find and remove/replace `is_public` references

```bash
# Find references
grep -r "is_public" src/
```

### Issue 2: Field `level` di Role

**Status**: Sudah dihapus dari database tapi masih ada code yang query

**Fix**: Remove all `level` references or update schema

### Issue 3: PENDING_REVIEW vs IN_REVIEW

**Status**: Both exist in enum, need cleanup

**Fix**:
```sql
-- Remove old value (after no data uses it)
ALTER TYPE document_status DROP VALUE 'PENDING_REVIEW';
```

## Prevention: Best Practices

### 1. Always Use Version Control
```bash
git status
git diff prisma/schema.prisma
git commit -m "chore: sync schema with database after migration"
```

### 2. Document Manual Migrations
- Create migration SQL files in `/prisma/migrations/`
- Name format: `manual_YYYYMMDD_description.sql`
- Always include rollback SQL

### 3. Testing Workflow
```bash
# 1. Backup
# 2. Migrate
# 3. Sync schema
npx prisma db pull
# 4. Generate client  
npx prisma generate
# 5. Build & test
npm run build
npm run test
```

### 4. Check for Orphaned References

```bash
# Check for field references that don't exist
npm run build 2>&1 | grep -i "property"

# Check Prisma queries for wrong fields
grep -r "prisma\\..*\\." src/ | grep -v node_modules
```

## Recovery Steps

If you encounter schema mismatch:

```bash
# 1. Stop all services
pkill -f "npm run dev"

# 2. Introspect current database
npx prisma db pull --force

# 3. Review changes
git diff prisma/schema.prisma

# 4. Regenerate everything
rm -rf node_modules/.prisma
npx prisma generate

# 5. Check build
npm run build

# 6. If errors, fix source code to match schema
# 7. Restart dev server
npm run dev
```

## Checklist Before Production Deploy

- [ ] Backup database
- [ ] Test migration on staging
- [ ] `npx prisma db pull` after migration
- [ ] `npx prisma generate`
- [ ] `npm run build` succeeds
- [ ] All tests pass
- [ ] API endpoints work
- [ ] No console errors

## Tools & Commands

```bash
# View database schema
docker exec dsm_postgres psql -U postgres -d dsm_db -c "\\d tablename"

# View enum values
docker exec dsm_postgres psql -U postgres -d dsm_db -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'enum_name'::regtype;"

# Compare schema with database
npx prisma db pull --print

# Validate schema
npx prisma validate

# Format schema
npx prisma format
```

## Emergency: Restore from Backup

```bash
# 1. Drop current database
docker exec dsm_postgres psql -U postgres -c "DROP DATABASE dsm_db;"
docker exec dsm_postgres psql -U postgres -c "CREATE DATABASE dsm_db;"

# 2. Restore backup
cat backup.sql | docker exec -i dsm_postgres psql -U postgres -d dsm_db

# 3. Sync everything
npx prisma db pull
npx prisma generate
npm run build
```

---

**Last Updated**: 2026-01-04  
**Issue**: Schema mismatch after PENDING_REVIEW → IN_REVIEW migration
