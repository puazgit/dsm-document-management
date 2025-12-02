const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function checkAndResetUserPasswords() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Checking current user passwords from database...\n');
        
        // Get all users from database
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                passwordHash: true,
                isActive: true,
                userRoles: {
                    where: { isActive: true },
                    include: {
                        role: true
                    }
                }
            }
        });
        
        console.log('👥 Current Users in Database:');
        console.log('==========================================');
        
        for (const user of users) {
            console.log(`\n📧 Email: ${user.email}`);
            console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
            console.log(`🆔 Username: ${user.username}`);
            console.log(`✅ Active: ${user.isActive}`);
            console.log(`🔑 Password Hash Length: ${user.passwordHash?.length || 0}`);
            
            if (user.userRoles.length > 0) {
                console.log(`👔 Role: ${user.userRoles[0].role.name} (${user.userRoles[0].role.displayName})`);
            } else {
                console.log(`👔 Role: No active role`);
            }
            
            // Test common passwords
            const testPasswords = ['password123', 'admin123', user.username, user.email.split('@')[0]];
            let foundPassword = null;
            
            for (const pwd of testPasswords) {
                if (user.passwordHash) {
                    const isValid = await bcrypt.compare(pwd, user.passwordHash);
                    if (isValid) {
                        foundPassword = pwd;
                        break;
                    }
                }
            }
            
            if (foundPassword) {
                console.log(`🔐 Current Password: ${foundPassword}`);
            } else {
                console.log(`❌ Password: Unknown (not matching common patterns)`);
            }
        }
        
        console.log('\n\n🔧 Resetting passwords to standard format...');
        console.log('==========================================');
        
        // Standard password mapping based on roles and usernames
        const passwordMap = {
            'admin@dsm.com': 'admin123',
            'kadiv@dsm.com': 'kadiv123',
            'manager@dsm.com': 'manager123',
            'viewer@dsm.com': 'viewer123',
            'ppd@dsm.com': 'ppd123',
            'member@dsm.com': 'member123'
        };
        
        for (const user of users) {
            const newPassword = passwordMap[user.email] || 'password123';
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordHash: hashedPassword
                }
            });
            
            console.log(`✅ ${user.email} → Password reset to: ${newPassword}`);
        }
        
        console.log('\n🎉 All user passwords have been standardized!');
        console.log('\n📋 Login Credentials Summary:');
        console.log('==========================================');
        
        for (const user of users) {
            const password = passwordMap[user.email] || 'password123';
            const role = user.userRoles[0]?.role.name || 'no-role';
            console.log(`📧 ${user.email} | 🔑 ${password} | 👔 ${role}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndResetUserPasswords();