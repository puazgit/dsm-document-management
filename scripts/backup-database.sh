#!/bin/bash
# Script untuk backup database PostgreSQL dari Docker container

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dsm_db_backup_${TIMESTAMP}.sql"

echo -e "${BLUE}🔄 Memulai backup database...${NC}"

# Buat direktori backup jika belum ada
mkdir -p ${BACKUP_DIR}

# Backup database
docker exec -t dsm_postgres pg_dump -U postgres dsm_db > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    FILE_SIZE=$(ls -lh ${BACKUP_FILE} | awk '{print $5}')
    echo -e "${GREEN}✅ Backup berhasil!${NC}"
    echo -e "${GREEN}📁 File: ${BACKUP_FILE}${NC}"
    echo -e "${GREEN}📊 Size: ${FILE_SIZE}${NC}"
else
    echo -e "${RED}❌ Backup gagal!${NC}"
    exit 1
fi
