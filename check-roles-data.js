const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRolesData() {
  try {
    console.log('🎭 DATA ROLES DI DATABASE:');
    console.log('=========================\n');
    
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: [{ level: 'desc' }, { name: 'asc' }]
    });
    
    if (roles.length === 0) {
      console.log('❌ Tidak ada roles yang ditemukan!');
    } else {
      console.log(`✅ Ditemukan ${roles.length} roles aktif:\n`);
      
      roles.forEach((role, index) => {
        console.log(`${index + 1}. ID: ${role.id}`);
        console.log(`   Name: ${role.name}`);
        console.log(`   Display Name: ${role.displayName}`);
        console.log(`   Description: ${role.description || 'N/A'}`);
        console.log(`   Level: ${role.level}`);
        console.log(`   Is System: ${role.isSystem ? 'Ya' : 'Tidak'}`);
        console.log(`   Users Assigned: ${role._count.userRoles}`);
        console.log(`   Created: ${role.createdAt.toISOString().split('T')[0]}`);
        console.log('');
      });
    }
    
    // Cek juga user yang sedang dilihat (Manager User)
    console.log('👤 USER MANAGER INFO:');
    console.log('====================\n');
    
    const managerUser = await prisma.user.findUnique({
      where: { email: 'manager@dsm.com' },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (managerUser) {
      console.log(`Email: ${managerUser.email}`);
      console.log(`Name: ${managerUser.firstName} ${managerUser.lastName}`);
      console.log(`Current Roles (${managerUser.userRoles.length}):`);
      
      if (managerUser.userRoles.length === 0) {
        console.log('   - Tidak ada role assigned');
      } else {
        managerUser.userRoles.forEach(ur => {
          console.log(`   - ${ur.role.displayName} (${ur.role.name})`);
        });
      }
      
      console.log('\n🔄 AVAILABLE ROLES FOR ASSIGNMENT:');
      console.log('==================================\n');
      
      const userRoleIds = managerUser.userRoles.map(ur => ur.role.id);
      const availableRoles = roles.filter(role => !userRoleIds.includes(role.id));
      
      if (availableRoles.length === 0) {
        console.log('❌ Tidak ada roles yang bisa di-assign (semua sudah dimiliki)');
      } else {
        availableRoles.forEach((role, index) => {
          console.log(`${index + 1}. ${role.displayName} (${role.name})`);
          console.log(`   Level: ${role.level} | System: ${role.isSystem ? 'Ya' : 'Tidak'}`);
        });
      }
    } else {
      console.log('❌ Manager user tidak ditemukan!');
    }
    
    // Cek juga API response untuk memastikan format yang benar
    console.log('\n📡 SIMULASI API RESPONSE:');
    console.log('========================\n');
    
    // Filter roles yang sudah dimiliki manager
    const userRoleIds = managerUser ? managerUser.userRoles.map(ur => ur.role.id) : [];
    const apiResponse = roles.filter(role => 
      role.id && 
      role.id.trim() !== '' && 
      !userRoleIds.includes(role.id)
    );
    
    console.log('API /api/roles response (untuk dropdown):');
    console.log(JSON.stringify(apiResponse.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      level: role.level,
      isSystem: role.isSystem
    })), null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRolesData();