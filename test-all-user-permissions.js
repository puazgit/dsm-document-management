const axios = require('axios');

async function testAllUserLogins() {
    const users = [
        { email: 'admin@dsm.com', password: 'password123', role: 'org_administrator' },
        { email: 'manager@dsm.com', password: 'password123', role: 'org_manager' },
        { email: 'ppd@dsm.com', password: 'password123', role: 'org_ppd' },
        { email: 'kadiv@dsm.com', password: 'password123', role: 'org_kadiv' },
        { email: 'member@dsm.com', password: 'password123', role: 'editor' },
        { email: 'viewer@dsm.com', password: 'password123', role: 'viewer' }
    ];

    console.log('🧪 Testing logins for all users to verify PDF permissions...\n');

    for (const user of users) {
        console.log(`\n🔐 Testing ${user.email} (expected role: ${user.role}):`);
        
        try {
            // Get CSRF token
            const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
            
            // Login
            const formData = new URLSearchParams();
            formData.append('email', user.email);
            formData.append('password', user.password);
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

            if (loginResponse.headers['set-cookie']) {
                // Get session
                const sessionResponse = await axios.get('http://localhost:3000/api/auth/session', {
                    headers: { 'Cookie': loginResponse.headers['set-cookie'].join('; ') }
                });

                const session = sessionResponse.data;
                if (session?.user) {
                    const hasPdfDownload = session.user.permissions?.includes('pdf.download');
                    const hasDocDownload = session.user.permissions?.includes('documents.download');
                    
                    console.log(`   ✅ Login successful`);
                    console.log(`   📧 Email: ${session.user.email}`);
                    console.log(`   👤 Role: ${session.user.role}`);
                    console.log(`   📄 PDF Download: ${hasPdfDownload ? '✅ YES' : '❌ NO'}`);
                    console.log(`   📁 Document Download: ${hasDocDownload ? '✅ YES' : '❌ NO'}`);
                    
                    if (session.user.permissions) {
                        const pdfPerms = session.user.permissions.filter(p => p.includes('pdf') || p.includes('download'));
                        console.log(`   🔑 PDF/Download Permissions: ${pdfPerms.join(', ')}`);
                    }
                } else {
                    console.log('   ❌ No user in session');
                }
            } else {
                console.log('   ❌ Login failed - no cookies');
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }
}

testAllUserLogins();