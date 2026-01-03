#!/bin/bash
# Script untuk restore full backup (database + schema + migrations)

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_DIR="backups"

echo -e "${BLUE}🔄 Full Restore Script${NC}"
echo ""

# List available full backups
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Backup directory not found${NC}"
    exit 1
fi

BACKUPS=($(ls -dt ${BACKUP_DIR}/full_backup_* 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    echo -e "${RED}❌ No full backups found${NC}"
    echo -e "${YELLOW}💡 Create one with: npm run db:backup:full${NC}"
    exit 1
fi

# Show available backups
echo -e "${YELLOW}📁 Available full backups:${NC}"
echo ""

for i in "${!BACKUPS[@]}"; do
    FOLDER=${BACKUPS[$i]}
    NAME=$(basename $FOLDER)
    
    # Check README if exists
    if [ -f "$FOLDER/README.md" ]; then
        DATE=$(grep "^## Backup Date" "$FOLDER/README.md" -A 1 | tail -1)
        COMMIT=$(cat "$FOLDER/git_commit.txt" 2>/dev/null | head -c 7)
        echo "$((i+1)). $NAME"
        echo "   Date: $DATE"
        echo "   Git: $COMMIT"
    else
        echo "$((i+1)). $NAME"
    fi
    echo ""
done

# Get user choice
if [ ! -z "$1" ]; then
    RESTORE_FOLDER="$1"
else
    echo -e "${BLUE}Pilih nomor backup (1-${#BACKUPS[@]}) atau Enter untuk terbaru:${NC}"
    read -p "> " choice
    
    if [ -z "$choice" ]; then
        RESTORE_FOLDER="${BACKUPS[0]}"
    elif [ "$choice" -ge 1 ] && [ "$choice" -le ${#BACKUPS[@]} ]; then
        RESTORE_FOLDER="${BACKUPS[$((choice-1))]}"
    else
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
    fi
fi

# Validate backup folder
if [ ! -d "$RESTORE_FOLDER" ]; then
    echo -e "${RED}❌ Backup folder not found: $RESTORE_FOLDER${NC}"
    exit 1
fi

if [ ! -f "$RESTORE_FOLDER/database.sql" ] || [ ! -f "$RESTORE_FOLDER/schema.prisma" ]; then
    echo -e "${RED}❌ Incomplete backup (missing database.sql or schema.prisma)${NC}"
    exit 1
fi

# Confirm
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will replace:${NC}"
echo -e "${YELLOW}   - Current database${NC}"
echo -e "${YELLOW}   - Prisma schema${NC}"
echo -e "${YELLOW}   - Migration files${NC}"
echo ""
echo -e "${YELLOW}📁 Restoring from: $(basename $RESTORE_FOLDER)${NC}"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}❌ Restore cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Starting full restore...${NC}"
echo ""

# 1. Restore Database
echo -e "${BLUE}1. Restoring database...${NC}"
docker exec -i dsm_postgres psql -U postgres -c "DROP DATABASE IF EXISTS dsm_db;" > /dev/null 2>&1
docker exec -i dsm_postgres psql -U postgres -c "CREATE DATABASE dsm_db;" > /dev/null 2>&1
cat $RESTORE_FOLDER/database.sql | docker exec -i dsm_postgres psql -U postgres -d dsm_db > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Database restored${NC}"
else
    echo -e "${RED}   ❌ Database restore failed${NC}"
    exit 1
fi

# 2. Restore Schema
echo -e "${BLUE}2. Restoring Prisma schema...${NC}"
cp $RESTORE_FOLDER/schema.prisma prisma/schema.prisma
echo -e "${GREEN}   ✅ Schema restored${NC}"

# 3. Restore Migrations
echo -e "${BLUE}3. Restoring migrations...${NC}"
if [ -d "$RESTORE_FOLDER/migrations" ]; then
    rm -rf prisma/migrations
    cp -r $RESTORE_FOLDER/migrations prisma/migrations
    echo -e "${GREEN}   ✅ Migrations restored${NC}"
else
    echo -e "${BLUE}   ℹ️  No migrations to restore${NC}"
fi

# 4. Generate Prisma Client
echo -e "${BLUE}4. Generating Prisma client...${NC}"
npx prisma generate > /dev/null 2>&1
echo -e "${GREEN}   ✅ Prisma client generated${NC}"

# 5. Verify
echo ""
echo -e "${GREEN}✅ Full restore completed!${NC}"
echo ""
echo -e "${BLUE}📊 Verification:${NC}"
npx prisma migrate status

echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Restart dev server: npm run dev"
echo -e "   2. Verify application works"
echo ""
