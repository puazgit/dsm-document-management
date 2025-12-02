const { PrismaClient } = require('@prisma/client');

async function auditRoles() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 COMPREHENSIVE ROLE AUDIT');
    console.log('='.repeat(60));
    
    // 1. Get all roles from database
    const dbRoles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        userRoles: {
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true }
            }
          }
        }
      },
      orderBy: { level: 'desc' }
    });
    
    console.log('\n📊 ROLES IN DATABASE:');
    const dbRoleNames = [];
    dbRoles.forEach((role, index) => {
      dbRoleNames.push(role.name);
      console.log(`${index + 1}. ${role.name} (Level: ${role.level})`);
      console.log(`   Description: ${role.description || 'No description'}`);
      console.log(`   Permissions: ${role.rolePermissions.length}`);
      console.log(`   Users: ${role.userRoles.length}`);
      if (role.userRoles.length > 0) {
        role.userRoles.forEach(ur => {
          console.log(`     - ${ur.user.email} (${ur.user.firstName} ${ur.user.lastName})`);
        });
      }
      console.log('');
    });
    
    console.log(`\n📋 DATABASE ROLE SUMMARY: ${dbRoleNames.length} roles`);
    console.log(`Roles: ${dbRoleNames.join(', ')}`);
    
    return dbRoleNames;
    
  } catch (error) {
    console.error('❌ Database Error:', error.message);
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

auditRoles();