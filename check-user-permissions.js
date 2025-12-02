const { PrismaClient } = require('@prisma/client');

async function checkUserPermissions() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Checking kadiv@dsm.com permissions...\n');
        
        const user = await prisma.user.findUnique({
            where: { email: 'kadiv@dsm.com' },
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
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 User Info:');
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        
        if (user.userRoles && user.userRoles.length > 0) {
            console.log('\n👥 Active Roles:');
            user.userRoles.forEach(ur => {
                console.log(`  - ${ur.role.name} (${ur.role.displayName})`);
            });
            
            // Collect all permissions from all roles
            const allPermissions = [];
            user.userRoles.forEach(ur => {
                if (ur.role.rolePermissions) {
                    ur.role.rolePermissions.forEach(rp => {
                        allPermissions.push(rp.permission.name);
                        console.log(`    Permission: ${rp.permission.name} (${rp.permission.resource || 'no resource'})`);
                    });
                }
            });
            
            console.log('\n📋 All Permission Names:');
            console.log(JSON.stringify(allPermissions, null, 2));
        } else {
            console.log('\n❌ No active roles found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkUserPermissions();