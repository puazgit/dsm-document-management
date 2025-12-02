const { PrismaClient } = require('@prisma/client');

async function checkAdminUser() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Checking admin@dsm.com user existence and details...\n');
        
        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@dsm.com' },
            include: {
                userRoles: {
                    where: { isActive: true },
                    include: {
                        role: {
                            include: {
                                rolePermissions: {
                                    include: {
                                        permission: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (!adminUser) {
            console.log('❌ admin@dsm.com user not found!');
            
            // Check if there are any users with admin in the email
            const adminUsers = await prisma.user.findMany({
                where: {
                    email: {
                        contains: 'admin'
                    }
                },
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    isActive: true
                }
            });
            
            console.log('\n📋 Users containing "admin":');
            adminUsers.forEach(user => {
                console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive}`);
            });
            
            return;
        }
        
        console.log('✅ admin@dsm.com user found!');
        console.log(`Email: ${adminUser.email}`);
        console.log(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
        console.log(`Active: ${adminUser.isActive}`);
        console.log(`Username: ${adminUser.username}`);
        console.log(`Group ID: ${adminUser.groupId || 'None'}`);
        console.log(`Divisi ID: ${adminUser.divisiId || 'None'}`);
        
        // Check password hash
        console.log(`\n🔐 Password hash exists: ${!!adminUser.passwordHash}`);
        console.log(`Password hash length: ${adminUser.passwordHash?.length || 0} characters`);
        
        // Check roles
        if (adminUser.userRoles && adminUser.userRoles.length > 0) {
            console.log('\n👥 Active Roles:');
            adminUser.userRoles.forEach(ur => {
                console.log(`  - ${ur.role.name} (${ur.role.displayName})`);
                
                console.log(`    Permissions:`);
                ur.role.rolePermissions.forEach(rp => {
                    console.log(`      - ${rp.permission.name}`);
                });
            });
        } else {
            console.log('\n❌ No active roles assigned to admin@dsm.com');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminUser();