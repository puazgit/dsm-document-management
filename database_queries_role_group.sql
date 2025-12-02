-- Query untuk melihat perbedaan Group vs Role
-- Jalankan di Prisma Studio atau database console

-- GROUPS (Organizational Structure)
SELECT 
    name as group_name,
    "displayName" as display_name,
    level,
    description,
    permissions
FROM groups 
ORDER BY level DESC;

-- Contoh hasil:
-- group_name     | display_name              | level | description
-- dirut          | Direktur Utama           | 10    | Pemimpin eksekutif...
-- administrator  | System Administrator     | 10    | Administrator sistem...
-- ppd            | PPD                      | 9     | Penanggung jawab dokumen...
-- manager        | Manager                  | 6     | Manajer departemen...

---

-- ROLES (Functional Permissions)  
SELECT 
    name as role_name,
    "displayName" as display_name,
    level,
    description,
    "isSystem"
FROM roles
ORDER BY level DESC;

-- Contoh hasil:
-- role_name | display_name | level | description           | isSystem
-- admin     | Administrator| 100   | Full system access    | true
-- editor    | Editor       | 50    | Can create, edit docs | true  
-- viewer    | Viewer       | 10    | Can only view docs    | true

---

-- USER ASSIGNMENTS
SELECT 
    u.email,
    u."firstName",
    u."lastName",
    g.name as group_name,
    g."displayName" as group_display
FROM users u
LEFT JOIN groups g ON u."groupId" = g.id
ORDER BY u."firstName";

-- Contoh hasil:
-- email           | firstName | lastName | group_name    | group_display
-- admin@dsm.com   | Admin     | User     | administrator | System Administrator
-- manager@dsm.com | Manager   | User     | manager       | Manager

---

-- USER ROLES (Many-to-Many)
SELECT 
    u.email,
    r.name as role_name,
    r."displayName" as role_display,
    ur."isActive",
    ur."expiresAt"
FROM users u
JOIN user_roles ur ON u.id = ur."userId"  
JOIN roles r ON ur."roleId" = r.id
WHERE ur."isActive" = true
ORDER BY u.email, r.level DESC;