import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function clearAndReseed() {
  console.log('🗑️  Clearing Database and Creating Fresh Seed Data\n');
  console.log('='.repeat(80));
  
  try {
    // Step 1: Clear existing data (in correct order due to foreign keys)
    console.log('\n📋 Step 1: Clearing existing data...\n');
    
    // Delete document-related data first (they reference users)
    console.log('   Deleting Document-related data...');
    await prisma.$executeRaw`DELETE FROM comments WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM document_versions WHERE 1=1`;
    await prisma.$executeRaw`DELETE FROM documents WHERE 1=1`;
    console.log('   ✅ Deleted documents and related data');
    
    console.log('   Deleting RolePermissions...');
    const deletedRolePerms = await prisma.rolePermission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedRolePerms.count} role permissions`);
    
    console.log('   Deleting UserRoles...');
    const deletedUserRoles = await prisma.userRole.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUserRoles.count} user roles`);
    
    console.log('   Deleting Permissions...');
    const deletedPerms = await prisma.permission.deleteMany({});
    console.log(`   ✅ Deleted ${deletedPerms.count} permissions`);
    
    console.log('   Deleting Roles...');
    const deletedRoles = await prisma.role.deleteMany({});
    console.log(`   ✅ Deleted ${deletedRoles.count} roles`);
    
    console.log('   Deleting Groups...');
    const deletedGroups = await prisma.group.deleteMany({});
    console.log(`   ✅ Deleted ${deletedGroups.count} groups`);
    
    console.log('   Deleting Users...');
    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`   ✅ Deleted ${deletedUsers.count} users`);
    
    // Step 2: Create fresh permissions
    console.log('\n📋 Step 2: Creating fresh permissions...\n');
    
    const permissionsData = [
      // Users module
      { name: 'users.view', displayName: 'View Users', module: 'users', action: 'view' },
      { name: 'users.create', displayName: 'Create Users', module: 'users', action: 'create' },
      { name: 'users.update', displayName: 'Update Users', module: 'users', action: 'update' },
      { name: 'users.delete', displayName: 'Delete Users', module: 'users', action: 'delete' },
      
      // Roles module
      { name: 'roles.view', displayName: 'View Roles', module: 'roles', action: 'view' },
      { name: 'roles.create', displayName: 'Create Roles', module: 'roles', action: 'create' },
      { name: 'roles.update', displayName: 'Update Roles', module: 'roles', action: 'update' },
      { name: 'roles.delete', displayName: 'Delete Roles', module: 'roles', action: 'delete' },
      
      // Permissions module
      { name: 'permissions.view', displayName: 'View Permissions', module: 'permissions', action: 'view' },
      { name: 'permissions.manage', displayName: 'Manage Permissions', module: 'permissions', action: 'manage' },
      
      // Documents module
      { name: 'documents.view', displayName: 'View Documents', module: 'documents', action: 'view' },
      { name: 'documents.create', displayName: 'Create Documents', module: 'documents', action: 'create' },
      { name: 'documents.update', displayName: 'Update Documents', module: 'documents', action: 'update' },
      { name: 'documents.delete', displayName: 'Delete Documents', module: 'documents', action: 'delete' },
      { name: 'documents.download', displayName: 'Download Documents', module: 'documents', action: 'download' },
      { name: 'documents.approve', displayName: 'Approve Documents', module: 'documents', action: 'approve' },
      
      // PDF module
      { name: 'pdf.view', displayName: 'View PDF', module: 'pdf', action: 'view' },
      { name: 'pdf.download', displayName: 'Download PDF', module: 'pdf', action: 'download' },
      { name: 'pdf.print', displayName: 'Print PDF', module: 'pdf', action: 'print' },
      { name: 'pdf.copy', displayName: 'Copy PDF Content', module: 'pdf', action: 'copy' },
      { name: 'pdf.watermark', displayName: 'PDF Without Watermark', module: 'pdf', action: 'watermark' },
      
      // Groups module
      { name: 'groups.view', displayName: 'View Groups', module: 'groups', action: 'view' },
      { name: 'groups.create', displayName: 'Create Groups', module: 'groups', action: 'create' },
      { name: 'groups.update', displayName: 'Update Groups', module: 'groups', action: 'update' },
      { name: 'groups.delete', displayName: 'Delete Groups', module: 'groups', action: 'delete' },
      
      // Audit module
      { name: 'audit.view', displayName: 'View Audit Logs', module: 'audit', action: 'view' },
      
      // Settings module
      { name: 'settings.view', displayName: 'View Settings', module: 'settings', action: 'view' },
      { name: 'settings.update', displayName: 'Update Settings', module: 'settings', action: 'update' },
    ];
    
    const permissions = await prisma.permission.createMany({
      data: permissionsData,
      skipDuplicates: true,
    });
    
    console.log(`   ✅ Created ${permissionsData.length} permissions`);
    
    // Get created permissions for reference
    const allPermissions = await prisma.permission.findMany();
    const permMap = new Map(allPermissions.map(p => [p.name, p.id]));
    
    // Step 3: Create fresh roles
    console.log('\n📋 Step 3: Creating fresh roles...\n');
    
    const rolesData = [
      // System roles
      { name: 'admin', displayName: 'Administrator', level: 100, isSystem: true },
      { name: 'manager', displayName: 'Manager', level: 70, isSystem: false },
      { name: 'editor', displayName: 'Editor', level: 50, isSystem: false },
      { name: 'viewer', displayName: 'Viewer', level: 30, isSystem: false },
      { name: 'guest', displayName: 'Guest', level: 10, isSystem: true },
    ];
    
    const createdRoles: any[] = [];
    for (const roleData of rolesData) {
      const role = await prisma.role.create({
        data: roleData,
      });
      createdRoles.push(role);
      console.log(`   ✅ Created role: ${role.displayName} (${role.name})`);
    }
    
    // Step 4: Assign permissions to roles
    console.log('\n📋 Step 4: Assigning permissions to roles...\n');
    
    // Admin gets all permissions
    const adminRole = createdRoles.find(r => r.name === 'admin');
    if (adminRole) {
      const adminPermissions = allPermissions.map(p => ({
        roleId: adminRole.id,
        permissionId: p.id,
        isGranted: true,
      }));
      await prisma.rolePermission.createMany({ data: adminPermissions });
      console.log(`   ✅ Admin: ${adminPermissions.length} permissions`);
    }
    
    // Manager permissions
    const managerRole = createdRoles.find(r => r.name === 'manager');
    if (managerRole) {
      const managerPerms = [
        'users.view', 'users.create', 'users.update',
        'documents.view', 'documents.create', 'documents.update', 'documents.delete', 'documents.download', 'documents.approve',
        'pdf.view', 'pdf.download', 'pdf.print', 'pdf.copy',
        'groups.view', 'groups.create', 'groups.update',
        'audit.view',
      ];
      const managerPermissions = managerPerms
        .map(name => permMap.get(name))
        .filter(Boolean)
        .map(permId => ({
          roleId: managerRole.id,
          permissionId: permId!,
          isGranted: true,
        }));
      await prisma.rolePermission.createMany({ data: managerPermissions });
      console.log(`   ✅ Manager: ${managerPermissions.length} permissions`);
    }
    
    // Editor permissions
    const editorRole = createdRoles.find(r => r.name === 'editor');
    if (editorRole) {
      const editorPerms = [
        'documents.view', 'documents.create', 'documents.update', 'documents.download',
        'pdf.view', 'pdf.download',
        'groups.view',
      ];
      const editorPermissions = editorPerms
        .map(name => permMap.get(name))
        .filter(Boolean)
        .map(permId => ({
          roleId: editorRole.id,
          permissionId: permId!,
          isGranted: true,
        }));
      await prisma.rolePermission.createMany({ data: editorPermissions });
      console.log(`   ✅ Editor: ${editorPermissions.length} permissions`);
    }
    
    // Viewer permissions
    const viewerRole = createdRoles.find(r => r.name === 'viewer');
    if (viewerRole) {
      const viewerPerms = [
        'documents.view', 'documents.download',
        'pdf.view', 'pdf.download', 'pdf.print', 'pdf.copy', 'pdf.watermark',
        'groups.view',
      ];
      const viewerPermissions = viewerPerms
        .map(name => permMap.get(name))
        .filter(Boolean)
        .map(permId => ({
          roleId: viewerRole.id,
          permissionId: permId!,
          isGranted: true,
        }));
      await prisma.rolePermission.createMany({ data: viewerPermissions });
      console.log(`   ✅ Viewer: ${viewerPermissions.length} permissions`);
    }
    
    // Guest permissions (minimal)
    const guestRole = createdRoles.find(r => r.name === 'guest');
    if (guestRole) {
      const guestPerms = ['documents.view', 'pdf.view'];
      const guestPermissions = guestPerms
        .map(name => permMap.get(name))
        .filter(Boolean)
        .map(permId => ({
          roleId: guestRole.id,
          permissionId: permId!,
          isGranted: true,
        }));
      await prisma.rolePermission.createMany({ data: guestPermissions });
      console.log(`   ✅ Guest: ${guestPermissions.length} permissions`);
    }
    
    // Step 5: Create fresh groups
    console.log('\n📋 Step 5: Creating fresh groups...\n');
    
    const groupsData = [
      { name: 'administrator', displayName: 'Administrator', level: 100, description: 'System administrators' },
      { name: 'management', displayName: 'Management', level: 80, description: 'Management team' },
      { name: 'finance', displayName: 'Finance & Accounting', level: 70, description: 'Finance department' },
      { name: 'hrd', displayName: 'Human Resources', level: 70, description: 'HR department' },
      { name: 'operations', displayName: 'Operations', level: 60, description: 'Operations team' },
      { name: 'staff', displayName: 'Staff', level: 50, description: 'General staff' },
      { name: 'guest', displayName: 'Guest', level: 10, description: 'Guest users' },
    ];
    
    const createdGroups: any[] = [];
    for (const groupData of groupsData) {
      const group = await prisma.group.create({
        data: groupData,
      });
      createdGroups.push(group);
      console.log(`   ✅ Created group: ${group.displayName} (${group.name})`);
    }
    
    // Step 6: Create fresh users
    console.log('\n📋 Step 6: Creating fresh users...\n');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const usersData = [
      {
        email: 'admin@dsm.com',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        passwordHash: hashedPassword,
        isActive: true,
        roleName: 'admin',
        groupName: 'administrator',
      },
      {
        email: 'manager@dsm.com',
        username: 'manager',
        firstName: 'Department',
        lastName: 'Manager',
        passwordHash: hashedPassword,
        isActive: true,
        roleName: 'manager',
        groupName: 'management',
      },
      {
        email: 'editor@dsm.com',
        username: 'editor',
        firstName: 'Content',
        lastName: 'Editor',
        passwordHash: hashedPassword,
        isActive: true,
        roleName: 'editor',
        groupName: 'operations',
      },
      {
        email: 'viewer@dsm.com',
        username: 'viewer',
        firstName: 'Document',
        lastName: 'Viewer',
        passwordHash: hashedPassword,
        isActive: true,
        roleName: 'viewer',
        groupName: 'staff',
      },
      {
        email: 'finance@dsm.com',
        username: 'finance',
        firstName: 'Finance',
        lastName: 'Staff',
        passwordHash: hashedPassword,
        isActive: true,
        roleName: 'editor',
        groupName: 'finance',
      },
    ];
    
    for (const userData of usersData) {
      const { roleName, groupName, ...userCreateData } = userData;
      
      // Find group
      const group = createdGroups.find(g => g.name === groupName);
      
      const user = await prisma.user.create({
        data: {
          ...userCreateData,
          groupId: group?.id,
        },
      });
      
      const role = createdRoles.find(r => r.name === roleName);
      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
            assignedBy: user.id, // Self-assigned on creation
            isActive: true,
          },
        });
        console.log(`   ✅ Created user: ${user.email} → ${role.displayName} (${group?.displayName || 'No Group'})`);
      }
    }
    
    // Step 7: Summary
    console.log('\n');
    console.log('='.repeat(80));
    console.log('\n✅ DATABASE SUCCESSFULLY CLEARED AND RESEEDED!\n');
    
    const finalStats = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      groups: await prisma.group.count(),
      userRoles: await prisma.userRole.count(),
      rolePermissions: await prisma.rolePermission.count(),
    };
    
    console.log('📊 Final Statistics:');
    console.log(`   Users: ${finalStats.users}`);
    console.log(`   Roles: ${finalStats.roles}`);
    console.log(`   Permissions: ${finalStats.permissions}`);
    console.log(`   Groups: ${finalStats.groups}`);
    console.log(`   UserRole assignments: ${finalStats.userRoles}`);
    console.log(`   RolePermission assignments: ${finalStats.rolePermissions}`);
    
    console.log('\n👥 Test Accounts (password: password123):');
    console.log('   • admin@dsm.com - Administrator (Administrator group)');
    console.log('   • manager@dsm.com - Manager (Management group)');
    console.log('   • editor@dsm.com - Editor (Operations group)');
    console.log('   • viewer@dsm.com - Viewer (Staff group)');
    console.log('   • finance@dsm.com - Editor (Finance group)');
    
    console.log('\n🏢 Groups Created:');
    console.log('   • Administrator (Level 100)');
    console.log('   • Management (Level 80)');
    console.log('   • Finance & Accounting (Level 70)');
    console.log('   • Human Resources (Level 70)');
    console.log('   • Operations (Level 60)');
    console.log('   • Staff (Level 50)');
    console.log('   • Guest (Level 10)');
    
    console.log('\n🔑 Permission Highlights:');
    console.log('   • Admin: All 28 permissions');
    console.log('   • Manager: User management, documents, PDF features (17 permissions)');
    console.log('   • Editor: Document editing, basic PDF (7 permissions)');
    console.log('   • Viewer: Read access, full PDF features (8 permissions)');
    console.log('   • Guest: View only - minimal (2 permissions)');
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error during clear and reseed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  clearAndReseed().catch(console.error);
}

export default clearAndReseed;
