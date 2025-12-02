const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function resetPasswords() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Resetting user passwords to standard format...\n');
        
        // Standard password mapping
        const passwordUpdates = [
            { email: 'admin@dsm.com', password: 'admin123' },
            { email: 'kadiv@dsm.com', password: 'kadiv123' },
            { email: 'manager@dsm.com', password: 'manager123' },
            { email: 'viewer@dsm.com', password: 'viewer123' },
            { email: 'ppd@dsm.com', password: 'ppd123' },
            { email: 'member@dsm.com', password: 'member123' }
        ];
        
        for (const { email, password } of passwordUpdates) {
            const hashedPassword = await bcrypt.hash(password, 12);
            
            const result = await prisma.user.updateMany({
                where: { email: email },
                data: {
                    passwordHash: hashedPassword
                }
            });
            
            if (result.count > 0) {
                console.log(`✅ ${email} → Password set to: ${password}`);
            } else {
                console.log(`❌ ${email} → User not found`);
            }
        }
        
        console.log('\n🎉 Password reset complete!');
        console.log('\n📋 Test these credentials:');
        console.log('==========================================');
        passwordUpdates.forEach(({ email, password }) => {
            console.log(`📧 ${email} | 🔑 ${password}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPasswords();