# Database Backup & Restore Guide

## Metode Backup Database

Ada beberapa metode untuk backup database PostgreSQL pada project ini:

### 1. **Menggunakan Script Otomatis (Recommended)**

Script ini sudah disiapkan dan mudah digunakan:

```bash
# Backup database
./scripts/backup-database.sh

# Restore database dari backup
./scripts/restore-database.sh backups/dsm_db_backup_YYYYMMDD_HHMMSS.sql
```

**Kelebihan:**
- ✅ Otomatis dengan timestamp
- ✅ Output berwarna dan informatif
- ✅ Validasi error
- ✅ Mudah digunakan

### 2. **Manual Docker Command**

Jika Anda ingin backup manual tanpa script:

```bash
# Backup
docker exec dsm_postgres pg_dump -U postgres dsm_db > backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
cat backups/your_backup_file.sql | docker exec -i dsm_postgres psql -U postgres -d dsm_db
```

### 3. **Backup dengan Compression**

Untuk file backup yang lebih kecil:

```bash
# Backup dengan gzip
docker exec dsm_postgres pg_dump -U postgres dsm_db | gzip > backups/dsm_db_$(date +%Y%m%d).sql.gz

# Restore dari gzip
gunzip < backups/dsm_db_YYYYMMDD.sql.gz | docker exec -i dsm_postgres psql -U postgres -d dsm_db
```

## Struktur Folder Backup

```
backups/
├── dsm_db_backup_20260102_120000.sql  # Auto backup
├── dsm_db_backup_20260102_130000.sql
├── manual_backup_20260102_140000.sql  # Manual backup
└── phase7/                             # Old backups
```

## Jadwal Backup yang Disarankan

### Development
- **Daily**: Sebelum perubahan besar
- **Before Migration**: Setiap kali menjalankan migration
- **Before Seed**: Sebelum re-seed database

### Production
- **Hourly**: Via cron job (optional)
- **Daily**: Full backup di jam 02:00
- **Weekly**: Long-term storage
- **Before Update**: Setiap deploy aplikasi

## Cron Job untuk Auto Backup (Production)

Tambahkan ke crontab:

```bash
# Edit crontab
crontab -e

# Backup setiap hari jam 2 pagi
0 2 * * * cd /path/to/newdsmt && ./scripts/backup-database.sh

# Backup setiap 6 jam
0 */6 * * * cd /path/to/newdsmt && ./scripts/backup-database.sh

# Cleanup backup lama (simpan 7 hari terakhir)
0 3 * * * find /path/to/newdsmt/backups -name "*.sql" -mtime +7 -delete
```

## Restore Step-by-Step

### 1. Stop Aplikasi (Optional tapi recommended)

```bash
# Stop container jika perlu
docker compose down
```

### 2. Restore Database

```bash
./scripts/restore-database.sh backups/dsm_db_backup_20260102_120000.sql
```

Script akan:
- ⚠️ Menampilkan warning
- ❓ Meminta konfirmasi
- 🗑️ Drop database lama
- 🆕 Create database baru
- 📥 Restore dari backup

### 3. Restart Aplikasi

```bash
docker compose up -d
npm run dev
```

## Verify Backup

Pastikan backup berhasil dengan cek:

```bash
# Cek size file
ls -lh backups/dsm_db_backup_*.sql

# Cek content (beberapa baris pertama)
head -n 20 backups/dsm_db_backup_*.sql

# Test restore di database temporary (advanced)
docker exec -i dsm_postgres createdb -U postgres test_restore_db
cat backups/dsm_db_backup_20260102.sql | docker exec -i dsm_postgres psql -U postgres -d test_restore_db
docker exec -i dsm_postgres dropdb -U postgres test_restore_db
```

## Troubleshooting

### Error: "No such container"
```bash
# Cek nama container yang benar
docker ps --format "{{.Names}}" | grep postgres

# Update script dengan nama container yang benar
```

### Error: "Permission denied"
```bash
# Berikan permission execute
chmod +x scripts/backup-database.sh scripts/restore-database.sh
```

### Backup terlalu besar
```bash
# Gunakan compression
docker exec dsm_postgres pg_dump -U postgres dsm_db | gzip > backups/compressed.sql.gz

# Atau gunakan custom format (lebih efisien)
docker exec dsm_postgres pg_dump -U postgres -Fc dsm_db > backups/custom.dump
docker exec dsm_postgres pg_restore -U postgres -d dsm_db backups/custom.dump
```

## Best Practices

1. **✅ Selalu backup sebelum:**
   - Migration
   - Major updates
   - Production deployment
   - Testing destructive operations

2. **✅ Simpan backup di multiple locations:**
   - Local disk
   - External storage (USB, NAS)
   - Cloud storage (S3, Google Drive)

3. **✅ Test restore secara berkala:**
   - Minimal 1x per bulan
   - Pastikan backup bisa di-restore

4. **✅ Label backup dengan baik:**
   - Gunakan timestamp
   - Tambahkan deskripsi jika perlu
   - Contoh: `dsm_db_before_migration_v2.sql`

5. **✅ Cleanup backup lama:**
   - Jangan biarkan disk penuh
   - Simpan backup penting saja
   - Archive backup lama ke external storage

## Quick Commands

```bash
# Backup sekarang
./scripts/backup-database.sh

# List semua backup
ls -lht backups/*.sql

# Restore backup terakhir
LATEST=$(ls -t backups/*.sql | head -1)
./scripts/restore-database.sh $LATEST

# Hapus backup > 30 hari
find backups -name "*.sql" -mtime +30 -delete
```

## Alternative: Prisma Seed vs Database Restore

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Prisma Seed** | Clean start, development | Fresh data, consistent | Loses user data |
| **Database Backup** | Production, user data | Preserves everything | Larger files |

```bash
# Clean start dengan seed
npx prisma db push --force-reset
npx prisma db seed

# Restore dari backup (preserves data)
./scripts/restore-database.sh backups/latest.sql
```
