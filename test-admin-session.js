const axios = require('axios');

async function testAdminSession() {
    try {
        console.log('🧪 Testing admin@dsm.com session and permissions...\n');
        
        // Get CSRF token
        const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
        console.log('✅ CSRF token obtained');
        
        // Login as admin
        const formData = new URLSearchParams();
        formData.append('email', 'admin@dsm.com');
        formData.append('password', 'password123');
        formData.append('csrfToken', csrfResponse.data.csrfToken);
        
        const loginResponse = await axios.post(
            'http://localhost:3000/api/auth/callback/credentials',
            formData,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                maxRedirects: 0,
                validateStatus: () => true
            }
        );

        console.log('📋 Login Response Status:', loginResponse.status);

        if (loginResponse.headers['set-cookie']) {
            const cookies = loginResponse.headers['set-cookie'].join('; ');
            console.log('🍪 Login cookies received');
            
            // Get session
            const sessionResponse = await axios.get('http://localhost:3000/api/auth/session', {
                headers: { 'Cookie': cookies }
            });

            const session = sessionResponse.data;
            console.log('\n=== ADMIN SESSION DATA ===');
            console.log(JSON.stringify(session, null, 2));
            
            if (session?.user) {
                console.log('\n📊 Permission Analysis:');
                console.log(`Email: ${session.user.email}`);
                console.log(`Role: ${session.user.role}`);
                console.log(`Has permissions array: ${!!session.user.permissions}`);
                
                if (session.user.permissions) {
                    console.log(`Total permissions: ${session.user.permissions.length}`);
                    
                    const pdfPerms = session.user.permissions.filter(p => 
                        p.includes('pdf') || p.includes('download')
                    );
                    console.log('\n🔑 PDF/Download Permissions:');
                    pdfPerms.forEach(p => console.log(`  ✅ ${p}`));
                    
                    const hasPdfDownload = session.user.permissions.includes('pdf.download');
                    const hasDocDownload = session.user.permissions.includes('documents.download');
                    
                    console.log(`\n💾 PDF Download Permission: ${hasPdfDownload ? '✅ YES' : '❌ NO'}`);
                    console.log(`📁 Document Download Permission: ${hasDocDownload ? '✅ YES' : '❌ NO'}`);
                } else {
                    console.log('❌ No permissions array found in session!');
                }
            } else {
                console.log('❌ No user data in session');
            }

        } else {
            console.log('❌ No cookies received from login');
        }

    } catch (error) {
        console.error('❌ Error testing admin session:', error.response?.data || error.message);
    }
}

testAdminSession();