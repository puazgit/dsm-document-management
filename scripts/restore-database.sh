#!/bin/bash
# Script untuk restore database PostgreSQL dari file backup

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Backup file tidak diberikan${NC}"
    echo -e "${YELLOW}Usage: $0 <backup-file>${NC}"
    echo -e "${YELLOW}Example: $0 backups/dsm_db_backup_20260102_120000.sql${NC}"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: File backup tidak ditemukan: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: Ini akan menghapus semua data yang ada di database!${NC}"
echo -e "${YELLOW}📁 Backup file: $BACKUP_FILE${NC}"
read -p "Lanjutkan restore? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}❌ Restore dibatalkan${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 Memulai restore database...${NC}"

# Drop dan buat ulang database
docker exec -i dsm_postgres psql -U postgres -c "DROP DATABASE IF EXISTS dsm_db;"
docker exec -i dsm_postgres psql -U postgres -c "CREATE DATABASE dsm_db;"

# Restore database
cat $BACKUP_FILE | docker exec -i dsm_postgres psql -U postgres -d dsm_db

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restore berhasil!${NC}"
else
    echo -e "${RED}❌ Restore gagal!${NC}"
    exit 1
fi
