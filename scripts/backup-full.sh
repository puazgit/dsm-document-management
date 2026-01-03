#!/bin/bash
# Script untuk backup database + schema Prisma + migrations

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FOLDER="${BACKUP_DIR}/full_backup_${TIMESTAMP}"

echo -e "${BLUE}🔄 Full Backup (Database + Schema + Migrations)${NC}"
echo ""

# Create backup folder
mkdir -p ${BACKUP_FOLDER}

# 1. Backup Database
echo -e "${BLUE}1. Backing up database...${NC}"
docker exec -t dsm_postgres pg_dump -U postgres dsm_db > ${BACKUP_FOLDER}/database.sql

if [ $? -eq 0 ]; then
    DB_SIZE=$(ls -lh ${BACKUP_FOLDER}/database.sql | awk '{print $5}')
    echo -e "${GREEN}   ✅ Database backed up (${DB_SIZE})${NC}"
else
    echo -e "${RED}   ❌ Database backup failed!${NC}"
    exit 1
fi

# 2. Backup Prisma Schema
echo -e "${BLUE}2. Backing up Prisma schema...${NC}"
cp prisma/schema.prisma ${BACKUP_FOLDER}/schema.prisma
echo -e "${GREEN}   ✅ Schema backed up${NC}"

# 3. Backup Migrations
echo -e "${BLUE}3. Backing up migrations...${NC}"
if [ -d "prisma/migrations" ]; then
    cp -r prisma/migrations ${BACKUP_FOLDER}/migrations
    MIGRATION_COUNT=$(ls -1 prisma/migrations | wc -l | xargs)
    echo -e "${GREEN}   ✅ Migrations backed up (${MIGRATION_COUNT} files)${NC}"
else
    echo -e "${BLUE}   ℹ️  No migrations folder found${NC}"
fi

# 4. Save current git commit hash
echo -e "${BLUE}4. Saving git reference...${NC}"
git rev-parse HEAD > ${BACKUP_FOLDER}/git_commit.txt 2>/dev/null || echo "Not a git repository" > ${BACKUP_FOLDER}/git_commit.txt
COMMIT=$(cat ${BACKUP_FOLDER}/git_commit.txt | head -c 7)
echo -e "${GREEN}   ✅ Git commit: ${COMMIT}${NC}"

# 5. Create README
cat > ${BACKUP_FOLDER}/README.md << EOL
# Full Backup - ${TIMESTAMP}

## Backup Contents
- \`database.sql\` - PostgreSQL database dump
- \`schema.prisma\` - Prisma schema file
- \`migrations/\` - All migration files
- \`git_commit.txt\` - Git commit hash

## Restore Instructions

### 1. Restore Database
\`\`\`bash
docker exec -i dsm_postgres psql -U postgres -c "DROP DATABASE IF EXISTS dsm_db;"
docker exec -i dsm_postgres psql -U postgres -c "CREATE DATABASE dsm_db;"
cat ${BACKUP_FOLDER}/database.sql | docker exec -i dsm_postgres psql -U postgres -d dsm_db
\`\`\`

### 2. Restore Schema & Migrations
\`\`\`bash
cp ${BACKUP_FOLDER}/schema.prisma prisma/schema.prisma
rm -rf prisma/migrations
cp -r ${BACKUP_FOLDER}/migrations prisma/migrations
\`\`\`

### 3. Generate Prisma Client
\`\`\`bash
npx prisma generate
\`\`\`

### 4. Verify
\`\`\`bash
npx prisma migrate status
\`\`\`

## Backup Date
$(date)

## Git Commit
$(cat ${BACKUP_FOLDER}/git_commit.txt)
EOL

echo ""
echo -e "${GREEN}✅ Full backup completed!${NC}"
echo -e "${GREEN}📁 Location: ${BACKUP_FOLDER}${NC}"
echo ""
echo -e "${BLUE}Backup includes:${NC}"
echo -e "  - Database dump"
echo -e "  - Prisma schema"
echo -e "  - Migration files"
echo -e "  - Git reference"
echo ""
