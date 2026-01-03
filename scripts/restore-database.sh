#!/bin/bash
# Script untuk restore database PostgreSQL dari file backup

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_DIR="backups"

echo -e "${BLUE}🔄 Database Restore Script${NC}"
echo ""

# Cek apakah ada backup files
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql 2>/dev/null)" ]; then
    echo -e "${RED}❌ Tidak ada backup files di folder $BACKUP_DIR${NC}"
    exit 1
fi

# Jika ada argument, gunakan sebagai file backup
if [ ! -z "$1" ]; then
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ File backup tidak ditemukan: $BACKUP_FILE${NC}"
        exit 1
    fi
else
    # Tampilkan daftar backup (interactive mode)
    echo -e "${YELLOW}📁 Available backups:${NC}"
    echo ""
    
    # List backups dengan nomor
    BACKUPS=($(ls -t $BACKUP_DIR/*.sql 2>/dev/null))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        echo -e "${RED}❌ Tidak ada backup files${NC}"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        FILE=${BACKUPS[$i]}
        SIZE=$(ls -lh "$FILE" | awk '{print $5}')
        DATE=$(ls -lh "$FILE" | awk '{print $6, $7, $8}')
        echo "$((i+1)). $(basename $FILE) ($SIZE, $DATE)"
    done
    
    echo ""
    echo -e "${BLUE}Pilih nomor backup (1-${#BACKUPS[@]}) atau tekan Enter untuk backup terbaru:${NC}"
    read -p "> " choice
    
    if [ -z "$choice" ]; then
        # Gunakan backup terbaru
        BACKUP_FILE="${BACKUPS[0]}"
        echo -e "${GREEN}✓ Menggunakan backup terbaru${NC}"
    elif [ "$choice" -ge 1 ] && [ "$choice" -le ${#BACKUPS[@]} ]; then
        # Gunakan pilihan user (convert to 0-based index)
        BACKUP_FILE="${BACKUPS[$((choice-1))]}"
    else
        echo -e "${RED}❌ Pilihan tidak valid${NC}"
        exit 1
    fi
fi

echo ""
echo ""
echo -e "${YELLOW}⚠️  WARNING: Ini akan menghapus semua data yang ada di database!${NC}"
echo -e "${YELLOW}📁 Backup file: $(basename $BACKUP_FILE)${NC}"
echo ""
read -p "Lanjutkan restore? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}❌ Restore dibatalkan${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Memulai restore database...${NC}"

# Drop dan buat ulang database
echo -e "${BLUE}1. Dropping existing database...${NC}"
docker exec -i dsm_postgres psql -U postgres -c "DROP DATABASE IF EXISTS dsm_db;"
docker exec -i dsm_postgres psql -U postgres -c "CREATE DATABASE dsm_db;"

# Restore database
echo -e "${BLUE}2. Restoring from backup...${NC}"
cat $BACKUP_FILE | docker exec -i dsm_postgres psql -U postgres -d dsm_db

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Restore berhasil!${NC}"
    echo -e "${GREEN}📁 Restored from: $(basename $BACKUP_FILE)${NC}"
    echo ""
    echo -e "${YELLOW}💡 Jangan lupa jalankan: npx prisma generate${NC}"
else
    echo ""
    echo -e "${RED}❌ Restore gagal!${NC}"
    exit 1
fi
