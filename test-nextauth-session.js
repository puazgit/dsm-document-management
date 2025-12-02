const axios = require('axios');

async function testLogin() {
    try {
        console.log('🧪 Testing NextAuth session for kadiv@dsm.com...\n');
        
        // Get CSRF token first
        const csrfResponse = await axios.get('http://localhost:3001/api/auth/csrf');
        const csrfToken = csrfResponse.data.csrfToken;
        console.log('✅ CSRF Token obtained:', csrfToken);
        
        // Try to login
        const loginData = new URLSearchParams({
            email: 'kadiv@dsm.com',
            password: 'password123',
            csrfToken: csrfToken,
            callbackUrl: 'http://localhost:3001/documents',
            json: 'true'
        });

        const loginResponse = await axios.post(
            'http://localhost:3001/api/auth/callback/credentials',
            loginData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                maxRedirects: 0,
                validateStatus: () => true
            }
        );

        console.log('📋 Login Response Status:', loginResponse.status);
        
        const cookies = loginResponse.headers['set-cookie'];
        
        if (cookies) {
            console.log('🍪 Cookies received');
            
            // Get session
            const sessionResponse = await axios.get('http://localhost:3001/api/auth/session', {
                headers: {
                    'Cookie': cookies.join('; ')
                }
            });
            
            console.log('\n=== SESSION DATA ===');
            console.log(JSON.stringify(sessionResponse.data, null, 2));
            
            if (sessionResponse.data?.user) {
                console.log('\n🔍 User Details:');
                console.log(`Email: ${sessionResponse.data.user.email}`);
                console.log(`Name: ${sessionResponse.data.user.name}`);
                console.log(`Role: ${sessionResponse.data.user.role}`);
                
                if (sessionResponse.data.user.permissions) {
                    console.log('\n🔑 Permissions:');
                    sessionResponse.data.user.permissions.forEach(permission => {
                        console.log(`  - ${permission}`);
                    });
                    
                    // Check for PDF permissions specifically
                    const pdfPermissions = sessionResponse.data.user.permissions.filter(p => p.includes('pdf'));
                    console.log('\n📄 PDF-specific permissions:');
                    pdfPermissions.forEach(permission => {
                        console.log(`  ✓ ${permission}`);
                    });
                    
                    const hasDownloadPermission = sessionResponse.data.user.permissions.includes('pdf.download');
                    console.log(`\n💾 Has PDF Download Permission: ${hasDownloadPermission ? '✅ YES' : '❌ NO'}`);
                } else {
                    console.log('\n❌ No permissions found in session!');
                }
            } else {
                console.log('\n❌ No user data in session!');
            }
        } else {
            console.log('❌ No cookies received from login');
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
        if (error.response?.data) {
            console.log('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testLogin();