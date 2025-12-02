const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testUserAuthentication() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🧪 Testing user authentication with new passwords...\n');
        
        const testCredentials = [
            { email: 'kadiv@dsm.com', password: 'kadiv123' },
            { email: 'manager@dsm.com', password: 'manager123' },
            { email: 'viewer@dsm.com', password: 'viewer123' }
        ];
        
        for (const { email, password } of testCredentials) {
            console.log(`🔍 Testing: ${email} with password: ${password}`);
            
            const user = await prisma.user.findUnique({
                where: { email },
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
                console.log(`❌ User not found\n`);
                continue;
            }
            
            const isValidPassword = await bcrypt.compare(password, user.passwordHash);
            console.log(`🔐 Password valid: ${isValidPassword ? '✅' : '❌'}`);
            
            if (user.userRoles.length > 0) {
                const role = user.userRoles[0].role;
                console.log(`👔 Role: ${role.name} (${role.displayName})`);
                
                const pdfPermissions = role.rolePermissions
                    .filter(rp => rp.permission.name.includes('pdf') || rp.permission.name.includes('document'))
                    .map(rp => rp.permission.name);
                
                console.log(`📄 PDF Permissions: ${pdfPermissions.length > 0 ? pdfPermissions.join(', ') : 'None'}`);
            } else {
                console.log(`👔 Role: No active role`);
            }
            
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testUserAuthentication();