const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function testPasswordVerification() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔐 Testing password verification for admin@dsm.com...\n');
        
        // Get admin user
        const user = await prisma.user.findUnique({
            where: { email: 'admin@dsm.com' }
        });
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('👤 User found:', user.email);
        console.log('🔐 Password hash length:', user.passwordHash.length);
        
        // Test password verification
        const testPassword = 'password123';
        console.log('🧪 Testing password:', testPassword);
        
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);
        console.log('✅ Password verification:', isValid ? 'SUCCESS' : 'FAILED');
        
        if (!isValid) {
            // Test other common passwords
            const testPasswords = ['admin123', 'password', 'admin', '123456'];
            console.log('🔍 Testing alternative passwords...');
            
            for (const pwd of testPasswords) {
                const test = await bcrypt.compare(pwd, user.passwordHash);
                console.log(`   ${pwd}: ${test ? 'SUCCESS' : 'FAILED'}`);
                if (test) break;
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPasswordVerification();