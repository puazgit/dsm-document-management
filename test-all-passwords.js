const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function testAllUserPasswords() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔐 Testing passwords for all users...\n');
        
        const users = await prisma.user.findMany({
            select: {
                email: true,
                passwordHash: true,
                isActive: true
            }
        });
        
        const commonPasswords = ['password123', 'admin123', 'password', 'admin', '123456'];
        
        for (const user of users) {
            console.log(`👤 Testing ${user.email} (Active: ${user.isActive}):`);
            
            let foundPassword = null;
            for (const pwd of commonPasswords) {
                const isValid = await bcrypt.compare(pwd, user.passwordHash);
                if (isValid) {
                    foundPassword = pwd;
                    break;
                }
            }
            
            if (foundPassword) {
                console.log(`   ✅ Password: ${foundPassword}`);
            } else {
                console.log(`   ❌ None of the common passwords work`);
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAllUserPasswords();