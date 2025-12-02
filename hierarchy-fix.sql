-- Migration to fix Group-Role-Permission hierarchy
-- New proper hierarchy: User → Group → Role → Permission

-- Add GroupRole junction table to define which roles are available in each group
CREATE TABLE group_roles (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(group_id, role_id)
);

-- Add UserGroupRole to track user's role within a specific group
CREATE TABLE user_group_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE(user_id, group_id, role_id)
);

-- Remove the old permissions JSON from groups table
-- ALTER TABLE groups DROP COLUMN permissions;

-- The new hierarchy will be:
-- User belongs to Group(s) with specific Role(s)
-- Each Group-Role combination has specific Permissions
-- Permissions are still attached to Roles, but Roles are contextualized by Groups