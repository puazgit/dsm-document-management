#!/usr/bin/env node

const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login and session...');
        
        // First, try to get CSRF token
        const csrfResponse = await axios.get('http://localhost:3001/api/auth/csrf');
        const csrfToken = csrfResponse.data.csrfToken;
        
        console.log('CSRF Token obtained:', csrfToken);
        
        // Now try to login
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
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: () => true
            }
        );

        console.log('Login response status:', loginResponse.status);
        console.log('Login response headers:', loginResponse.headers);
        
        const cookies = loginResponse.headers['set-cookie'];
        
        if (cookies) {
            // Try to get session with cookies
            const sessionResponse = await axios.get('http://localhost:3001/api/auth/session', {
                headers: {
                    'Cookie': cookies.join('; ')
                }
            });
            
            console.log('\n=== SESSION DATA ===');
            console.log(JSON.stringify(sessionResponse.data, null, 2));
        } else {
            console.log('No cookies received from login');
        }

    } catch (error) {
        console.error('Error:', error.response?.status, error.response?.data || error.message);
    }
}

testLogin();