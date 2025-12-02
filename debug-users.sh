#!/bin/bash

echo "=== Testing Admin Users Page ==="
echo ""

# Test session endpoint
echo "1. Checking session status:"
curl -s "http://localhost:3000/api/auth/session" | head -c 200
echo ""
echo ""

# Test users API with different methods
echo "2. Testing users API directly:"
curl -s "http://localhost:3000/api/users?page=1&limit=5" -H "Content-Type: application/json" | head -c 200
echo ""
echo ""

echo "3. Testing with curl including cookies:"
curl -s -c cookies.txt -b cookies.txt "http://localhost:3000/api/users?page=1&limit=5" | head -c 200
echo ""
echo ""

echo "=== Debug Information ==="
echo "Check browser console for detailed error messages"
echo "Try logging in with admin@dsm.com / admin123 first"
echo "