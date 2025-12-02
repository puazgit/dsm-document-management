#!/bin/bash

echo "=== Testing Role Management System ==="
echo "Testing API endpoints without authentication..."
echo ""

echo "1. Testing /api/users (should require authentication):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://localhost:3001/api/users"
echo ""

echo "2. Testing /api/analytics (should require authentication):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://localhost:3001/api/analytics"
echo ""

echo "3. Testing /api/roles (should require authentication):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://localhost:3001/api/roles"
echo ""

echo "4. Testing main page (should redirect or show login):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "http://localhost:3001/"
echo ""

echo "=== Test Complete ==="