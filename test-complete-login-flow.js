const axios = require('axios');

async function testLoginFlow() {
    try {
        console.log('🔄 Testing complete login flow for admin@dsm.com...\n');
        
        // Step 1: Try to signout first (clear any existing session)
        try {
            console.log('1️⃣ Clearing existing session...');
            await axios.post('http://localhost:3000/api/auth/signout', {}, {
                headers: { 'Content-Type': 'application/json' }
            });
            console.log('   ✅ Session cleared');
        } catch (error) {
            console.log('   ℹ️  No existing session to clear');
        }
        
        // Step 2: Get fresh CSRF token
        console.log('\n2️⃣ Getting CSRF token...');
        const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
        const csrfToken = csrfResponse.data.csrfToken;
        console.log('   ✅ CSRF token obtained');
        
        // Step 3: Attempt login
        console.log('\n3️⃣ Logging in as admin@dsm.com...');
        const loginData = new URLSearchParams({
            email: 'admin@dsm.com',
            password: 'admin123',
            csrfToken: csrfToken,
            callbackUrl: 'http://localhost:3000/documents'
        });

        const loginResponse = await axios.post(
            'http://localhost:3000/api/auth/callback/credentials',
            loginData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: () => true
            }
        );

        console.log('   📋 Login Status:', loginResponse.status);
        console.log('   📋 Login Headers:', Object.keys(loginResponse.headers));
        
        if (loginResponse.headers['set-cookie']) {
            console.log('   🍪 Cookies received');
            
            // Step 4: Get session with cookies
            console.log('\n4️⃣ Checking session...');
            const sessionResponse = await axios.get('http://localhost:3000/api/auth/session', {
                headers: {
                    'Cookie': loginResponse.headers['set-cookie'].join('; ')
                }
            });

            console.log('   📄 Session Status:', sessionResponse.status);
            const sessionData = sessionResponse.data;
            
            if (sessionData && Object.keys(sessionData).length > 0) {
                console.log('\n✅ SESSION SUCCESSFUL!');
                console.log('📧 Email:', sessionData.user?.email);
                console.log('👤 Role:', sessionData.user?.role);
                console.log('🔑 Has Permissions Array:', !!sessionData.user?.permissions);
                
                if (sessionData.user?.permissions) {
                    console.log('📊 Total Permissions:', sessionData.user.permissions.length);
                    const pdfPerms = sessionData.user.permissions.filter(p => 
                        p.includes('pdf') || p.includes('download')
                    );
                    console.log('📄 PDF/Download Permissions:', pdfPerms);
                    
                    const hasPdfDownload = sessionData.user.permissions.includes('pdf.download');
                    console.log('💾 PDF Download Permission:', hasPdfDownload ? '✅ YES' : '❌ NO');
                } else {
                    console.log('❌ No permissions in session');
                }
            } else {
                console.log('❌ Empty session response');
                console.log('Response:', sessionData);
            }
        } else {
            console.log('❌ No cookies in login response');
            console.log('Response status:', loginResponse.status);
            console.log('Response data:', loginResponse.data);
        }

    } catch (error) {
        console.error('❌ Error in login flow:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

testLoginFlow();