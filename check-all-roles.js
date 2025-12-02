const { PrismaClient } = require('@prisma/client');

async function checkAllRolePermissions() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Checking all roles and their PDF permissions...\n');
        
        // Get all roles with their permissions
        const roles = await prisma.role.findMany({
            include: {
                rolePermissions: {
                    include: {
                        permission: true
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
            }
        });
        
        roles.forEach(role => {
            console.log(`\n📋 Role: ${role.name} (${role.displayName})`);
            console.log(`   Level: ${role.level}, Active: ${role.isActive}`);
            
            // Show users with this role
            if (role.userRoles.length > 0) {
                console.log('   👤 Users:');
                role.userRoles.forEach(ur => {
                    console.log(`      - ${ur.user.email} (${ur.user.firstName} ${ur.user.lastName})`);
                });
            } else {
                console.log('   👤 Users: No users assigned');
            }
            
            // Show permissions
            if (role.rolePermissions.length > 0) {
                const pdfPermissions = role.rolePermissions.filter(rp => 
                    rp.permission.name.includes('pdf') || 
                    rp.permission.name.includes('download')
                );
                
                console.log('   🔑 PDF/Download Permissions:');
                if (pdfPermissions.length > 0) {
                    pdfPermissions.forEach(rp => {
                        console.log(`      ✅ ${rp.permission.name} (${rp.permission.resource || 'no resource'})`);
                    });
                } else {
                    console.log('      ❌ No PDF/Download permissions');
                }
                
                console.log('   📝 All Permissions:');
                role.rolePermissions.forEach(rp => {
                    console.log(`      - ${rp.permission.name}`);
                });
            } else {
                console.log('   ❌ No permissions assigned');
            }
        });
        
        // Check for users without roles
        console.log('\n\n🔍 Checking users without active roles...');
        const usersWithoutRoles = await prisma.user.findMany({
            where: {
                userRoles: {
                    none: {
                        isActive: true
                    }
                }
            },
            select: {
                email: true,
                firstName: true,
                lastName: true,
                isActive: true
            }
        });
        
        if (usersWithoutRoles.length > 0) {
            console.log('👥 Users without active roles:');
            usersWithoutRoles.forEach(user => {
                console.log(`   - ${user.email} (${user.firstName} ${user.lastName}) - Active: ${user.isActive}`);
            });
        } else {
            console.log('✅ All users have active roles');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllRolePermissions();