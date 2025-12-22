import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeSystemRoles() {
  console.log('🔍 Analyzing System Roles\n');
  console.log('='.repeat(80));
  
  // Get all roles
  const allRoles = await prisma.role.findMany({
    include: {
      _count: {
        select: {
          userRoles: true,
          rolePermissions: true
        }
      },
      userRoles: {
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: {
      isSystem: 'desc'
    }
  });
  
  const systemRoles = allRoles.filter(r => r.isSystem);
  const regularRoles = allRoles.filter(r => !r.isSystem);
  
  console.log(`\n📊 ROLE STATISTICS:`);
  console.log(`   Total Roles: ${allRoles.length}`);
  console.log(`   System Roles: ${systemRoles.length}`);
  console.log(`   Regular Roles: ${regularRoles.length}`);
  
  console.log('\n\n🔐 SYSTEM ROLES (is_system = true):\n');
  console.log('-'.repeat(80));
  
  if (systemRoles.length === 0) {
    console.log('✅ No system roles found - all roles are editable');
  } else {
    for (const role of systemRoles) {
      const hasUsers = role._count.userRoles > 0;
      const hasPermissions = role._count.rolePermissions > 0;
      
      console.log(`\n📌 ${role.displayName} (${role.name})`);
      console.log(`   ID: ${role.id}`);
      console.log(`   Level: ${role.level}`);
      console.log(`   Active: ${role.isActive ? '✅' : '❌'}`);
      console.log(`   Users Assigned: ${role._count.userRoles}`);
      console.log(`   Permissions: ${role._count.rolePermissions}`);
      
      if (hasUsers) {
        console.log(`   👥 Assigned Users:`);
        role.userRoles.forEach(ur => {
          console.log(`      - ${ur.user.firstName} ${ur.user.lastName} (${ur.user.email})`);
        });
      } else {
        console.log(`   ⚠️  No users assigned`);
      }
      
      console.log(`   Status: ${hasUsers || hasPermissions ? '🔴 IN USE' : '⚪ UNUSED'}`);
    }
  }
  
  console.log('\n\n👥 REGULAR ROLES (is_system = false):\n');
  console.log('-'.repeat(80));
  
  const usedRegularRoles = regularRoles.filter(r => r._count.userRoles > 0);
  const unusedRegularRoles = regularRoles.filter(r => r._count.userRoles === 0);
  
  console.log(`\n✅ Used Regular Roles: ${usedRegularRoles.length}`);
  usedRegularRoles.forEach(role => {
    console.log(`   - ${role.displayName} (${role.name}): ${role._count.userRoles} users, ${role._count.rolePermissions} perms`);
  });
  
  console.log(`\n⚪ Unused Regular Roles: ${unusedRegularRoles.length}`);
  unusedRegularRoles.forEach(role => {
    console.log(`   - ${role.displayName} (${role.name}): 0 users, ${role._count.rolePermissions} perms`);
  });
  
  console.log('\n\n');
  console.log('='.repeat(80));
  console.log('\n💡 ANALYSIS & RECOMMENDATIONS:\n');
  
  if (systemRoles.length > 0) {
    console.log('❓ Purpose of is_system flag:');
    console.log('   - Prevents deletion via admin interface');
    console.log('   - Marks critical roles for application functionality');
    console.log('   - Usually: admin, system, guest, etc.');
    console.log('');
    
    const unusedSystemRoles = systemRoles.filter(r => r._count.userRoles === 0 && r._count.rolePermissions === 0);
    
    if (unusedSystemRoles.length > 0) {
      console.log('⚠️  UNUSED System Roles Found:');
      unusedSystemRoles.forEach(role => {
        console.log(`   - ${role.name}: Consider removing is_system flag or deleting`);
      });
      console.log('');
    }
    
    const activeSystemRoles = systemRoles.filter(r => r._count.userRoles > 0 || r._count.rolePermissions > 0);
    
    if (activeSystemRoles.length > 0) {
      console.log('✅ Active System Roles (should keep is_system = true):');
      activeSystemRoles.forEach(role => {
        console.log(`   - ${role.name}: ${role._count.userRoles} users`);
      });
      console.log('');
    }
    
    console.log('📋 Recommendations:');
    console.log('   1. Keep is_system = true for critical roles (admin, guest)');
    console.log('   2. Set is_system = false for organizational roles');
    console.log('   3. Delete or convert unused system roles');
    console.log('   4. System roles prevent accidental deletion in UI');
  } else {
    console.log('✅ No system roles - all roles are fully editable');
    console.log('   Consider marking critical roles (admin, guest) as system roles');
    console.log('   to prevent accidental deletion.');
  }
  
  console.log('\n\n📊 RELEVANCE ASSESSMENT:\n');
  
  if (systemRoles.length > 0) {
    const criticalRoles = ['admin', 'administrator', 'guest', 'system'];
    const systemCritical = systemRoles.filter(r => criticalRoles.includes(r.name.toLowerCase()));
    const systemNonCritical = systemRoles.filter(r => !criticalRoles.includes(r.name.toLowerCase()));
    
    console.log(`   Critical System Roles: ${systemCritical.length} ✅ RELEVANT`);
    systemCritical.forEach(r => console.log(`      - ${r.name}`));
    
    if (systemNonCritical.length > 0) {
      console.log(`\n   Non-Critical System Roles: ${systemNonCritical.length} ⚠️  REVIEW NEEDED`);
      systemNonCritical.forEach(r => {
        const status = r._count.userRoles > 0 ? '🔴 HAS USERS' : '⚪ NO USERS';
        console.log(`      - ${r.name} (${status})`);
      });
    }
  }
  
  console.log('\n');
  
  await prisma.$disconnect();
}

analyzeSystemRoles().catch(console.error);
