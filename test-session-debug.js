const axios = require('axios');

async function testSession() {
    try {
        // Login as kadiv@dsm.com
        console.log('🔐 Logging in as kadiv@dsm.com...');
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/callback/credentials', {
            email: 'kadiv@dsm.com',
            password: 'password123',
            csrfToken: 'test-token'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            withCredentials: true
        });

        console.log('Login Response:', loginResponse.status);
        
        // Get session
        const sessionResponse = await axios.get('http://localhost:3001/api/auth/session', {
            withCredentials: true,
            headers: {
                'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
            }
        });

        console.log('\n📋 Session Data:');
        console.log(JSON.stringify(sessionResponse.data, null, 2));
        
        if (sessionResponse.data?.user?.permissions) {
            console.log('\n🔑 User Permissions:');
            sessionResponse.data.user.permissions.forEach(permission => {
                console.log(`  - ${permission}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testSession();