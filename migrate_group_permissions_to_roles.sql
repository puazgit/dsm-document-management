-- Migration script untuk memindahkan Group permissions ke Role system
-- File: migrate_group_permissions_to_roles.sql

-- 1. Buat role baru berdasarkan Group yang memiliki permissions
INSERT INTO roles (id, name, "displayName", description, level, "isActive", "isSystem", "createdAt", "updatedAt")
SELECT 
    'role_from_' || id as id,
    'org_' || name as name,
    'Organizational Role: ' || "displayName" as "displayName",
    'Auto-migrated from Group: ' || COALESCE(description, '') as description,
    level,
    "isActive",
    false as "isSystem",
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM groups 
WHERE permissions IS NOT NULL AND permissions != 'null'::json;

-- 2. Buat permissions berdasarkan Group permissions JSON
-- (Script ini akan dijalankan via Prisma karena perlu parsing JSON)

-- 3. Assign UserRole untuk semua user yang ada di Group dengan permissions
INSERT INTO user_roles (id, "userId", "roleId", "assignedBy", "assignedAt", "isActive")
SELECT 
    gen_random_uuid() as id,
    u.id as "userId",
    'role_from_' || g.id as "roleId",
    'system_migration' as "assignedBy",
    NOW() as "assignedAt",
    true as "isActive"
FROM users u
JOIN groups g ON u."groupId" = g.id
WHERE g.permissions IS NOT NULL AND g.permissions != 'null'::json
ON CONFLICT ("userId", "roleId") DO NOTHING;

-- 4. Backup Group permissions before removing
CREATE TABLE IF NOT EXISTS group_permissions_backup AS
SELECT id, name, "displayName", permissions, "createdAt"
FROM groups 
WHERE permissions IS NOT NULL;

-- Note: Actual permissions field removal will be done via Prisma migrate