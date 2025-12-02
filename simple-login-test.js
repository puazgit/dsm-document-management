#!/usr/bin/env node
const axios = require('axios');

async function testSimpleLogin() {
    try {
        console.log('🧪 Testing simple login...\n');
        
        // Make a simple request to check if server is responding
        const healthCheck = await axios.get('http://localhost:3000/api/auth/session');
        console.log('✅ Server is responding, status:', healthCheck.status);
        
        // Get CSRF token
        const csrfResponse = await axios.get('http://localhost:3000/api/auth/csrf');
        console.log('✅ CSRF token obtained');
        
        // Prepare login data
        const formData = new URLSearchParams();
        formData.append('email', 'kadiv@dsm.com');
        formData.append('password', 'password123');
        formData.append('csrfToken', csrfResponse.data.csrfToken);
        formData.append('callbackUrl', 'http://localhost:3000/documents');
        
        // Attempt login
        const loginResponse = await axios.post(
            'http://localhost:3000/api/auth/callback/credentials',
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: function (status) {
                    return status >= 200 && status < 400;
                }
            }
        );
        
        console.log('📋 Login response:', {
            status: loginResponse.status,
            statusText: loginResponse.statusText,
            headers: Object.keys(loginResponse.headers)
        });
        
        // Try to get session if we have cookies
        if (loginResponse.headers['set-cookie']) {
            console.log('\n🍪 Login cookies received, checking session...');
            
            const sessionResponse = await axios.get('http://localhost:3000/api/auth/session', {
                headers: {
                    'Cookie': loginResponse.headers['set-cookie'].join('; ')
                }
            });
            
            console.log('\n📄 Session Response:');
            console.log(JSON.stringify(sessionResponse.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
    }
}

testSimpleLogin();