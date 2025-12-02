import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignAdminRole() {
  console.log('🔧 Assigning admin role to admin user...');

  try {
    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' }
    });

    if (!adminUser) {
      console.error('❌ Admin user not found!');
      return;
    }

    // Find admin role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' }
    });

    if (!adminRole) {
      console.error('❌ Admin role not found!');
      return;
    }

    // Check if admin user already has admin role
    const existingUserRole = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      }
    });

    if (existingUserRole) {
      console.log('✅ Admin user already has admin role');
      return;
    }

    // Assign admin role to admin user
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        assignedBy: adminUser.id, // Self-assigned
        assignedAt: new Date(),
        isActive: true
      }
    });

    console.log('✅ Admin role assigned to admin user successfully!');

    // Also assign roles to other sample users
    const users = [
      { email: 'ppd@dsm.com', roleName: 'editor' },
      { email: 'kadiv@dsm.com', roleName: 'editor' },
      { email: 'manager@dsm.com', roleName: 'editor' },
      { email: 'member@dsm.com', roleName: 'viewer' }
    ];

    for (const userData of users) {
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      const role = await prisma.role.findUnique({
        where: { name: userData.roleName }
      });

      if (user && role) {
        // Check if user already has this role
        const existingRole = await prisma.userRole.findUnique({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: role.id
            }
          }
        });

        if (!existingRole) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: role.id,
              assignedBy: adminUser.id,
              assignedAt: new Date(),
              isActive: true
            }
          });
          console.log(`✅ Assigned ${role.name} role to ${user.email}`);
        } else {
          console.log(`✅ ${user.email} already has ${role.name} role`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error assigning roles:', error);
    throw error;
  }
}

assignAdminRole()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });