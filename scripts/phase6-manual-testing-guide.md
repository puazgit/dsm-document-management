# Phase 6: Manual Testing Guide
**Testing Capability System - Browser & API Testing**

## Prerequisites
- Development server running (`npm run dev`)
- Test user accounts created (admin, manager, viewer, etc.)
- Browser DevTools open (F12)
- API testing tool ready (Postman, Thunder Client, or curl)

## Part 1: Session & Authentication Testing

### Test 1.1: Login and Inspect Session
1. **Login as admin user**
   ```
   Email: admin@example.com  
   Password: [your admin password]
   ```

2. **Open Browser DevTools → Application → Cookies**
   - Find `next-auth.session-token` cookie
   - Note: JWT contains capabilities, not permissions

3. **Check session in console:**
   ```javascript
   // Open Console and run:
   fetch('/api/auth/session')
     .then(r => r.json())
     .then(data => {
       console.log('Session Data:', data);
       console.log('Capabilities:', data.user.capabilities);
       console.log('Has permissions field?', 'permissions' in data.user);
     });
   ```

   **Expected Result:**
   - ✅ `session.user.capabilities` exists (array of strings)
   - ✅ `session.user.permissions` does NOT exist
   - ✅ Capabilities array has 69 items for admin

### Test 1.2: Test Different User Roles
Repeat Test 1.1 for each role:
- **Manager:** Should have ~22 capabilities
- **Editor:** Should have ~10 capabilities
- **Viewer:** Should have ~18 capabilities
- **Guest:** Should have ~3 capabilities

### Test 1.3: Session Refresh
1. **Check initial capability count**
2. **Wait 60+ seconds** (or manually refresh session)
3. **Check capability count again**
4. **Expected:** Capabilities should reload from database

## Part 2: API Endpoint Testing

### Test 2.1: Document Endpoints (Capability-Based)

#### GET /api/documents (List Documents)
```bash
# Test as admin (should succeed)
curl http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  | jq

# Expected: 200 OK, list of documents
```

#### POST /api/documents (Create Document)
```bash
# Test as viewer (should fail)
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Test"}' \
  | jq

# Expected: 403 Forbidden (insufficient capabilities)

# Test as admin (should succeed)
curl -X POST http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "content": "Test"}' \
  | jq

# Expected: 201 Created
```

#### DELETE /api/documents/[id]/archive (Archive Document)
```bash
# Test as manager (check if has DOCUMENT_DELETE capability)
curl -X DELETE http://localhost:3000/api/documents/DOC_ID/archive \
  -H "Cookie: next-auth.session-token=MANAGER_TOKEN" \
  | jq

# Expected: 403 or 200 depending on DOCUMENT_DELETE capability
```

### Test 2.2: User Management Endpoints

#### GET /api/users (List Users)
```bash
# Test as admin (should succeed)
curl http://localhost:3000/api/users \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  | jq

# Expected: 200 OK, list of users
```

### Test 2.3: Debug Endpoint

#### GET /api/debug-permissions (Now returns capabilities)
```bash
curl http://localhost:3000/api/debug-permissions \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN" \
  | jq

# Expected Response:
# {
#   "capabilities": ["DOCUMENT_VIEW", "DOCUMENT_CREATE", ...],
#   "hasDocumentEditCapability": true,
#   "note": "Migrated to capability-based"
# }
```

**Check:**
- ✅ Response has `capabilities` field (not `permissions`)
- ✅ Capability check uses modern names
- ✅ Migration note present

## Part 3: UI Component Testing

### Test 3.1: Role-Based Header
1. **Navigate to any page with header**
2. **Check admin role badge**
   - Should display "X capabilities" (not "X permissions")
3. **Logout and login as viewer**
   - Badge should show fewer capabilities

### Test 3.2: PDF Viewer Component
1. **Navigate to a document with PDF**
2. **Open document view**
3. **Test as admin:**
   - ✅ Download button visible (PDF_DOWNLOAD capability)
   - ✅ Print button visible (PDF_PRINT capability)
   - ✅ Copy text enabled (PDF_COPY capability)
4. **Test as viewer:**
   - ❌ Download button may be hidden
   - ❌ Print button may be hidden
   - ❌ Copy may be disabled

### Test 3.3: Document List Component
1. **Navigate to /documents**
2. **Check console for debug logs**
   ```
   Session capabilities: ["DOCUMENT_VIEW", ...]
   ```
3. **Test download button on documents**
   - Should be enabled/disabled based on PDF_DOWNLOAD capability

### Test 3.4: Navigation Visibility
1. **Login as admin**
   - ✅ Admin nav visible
   - ✅ Upload button visible
   - ✅ User management visible

2. **Login as viewer**
   - ❌ Admin nav hidden
   - ❌ Upload button hidden
   - ❌ User management hidden

### Test 3.5: Feature Toggles (useCapabilities Hook)
Open any page and run in console:
```javascript
// This tests the useCapabilities hook indirectly
// Check what features are visible/enabled for current user
console.log('Admin Nav:', document.querySelector('[data-admin-nav]') !== null);
console.log('Upload Button:', document.querySelector('[data-upload-button]') !== null);
```

## Part 4: Backward Compatibility Testing

### Test 4.1: Legacy Components Still Work
1. **Navigate to Permission Matrix** (if available)
   - URL: `/admin/permissions` or similar
2. **Check if legacy permission UI loads**
   - Should show deprecated warning
   - Should still display permission data
3. **Check console for deprecation warnings**

### Test 4.2: Legacy Hooks
If any components use `useRoleVisibility()`:
```javascript
// Check in DevTools console
import { useRoleVisibility } from '@/hooks/use-role-visibility';
// Component should still work but map to capabilities
```

## Part 5: Error Handling Testing

### Test 5.1: Insufficient Capability
1. **Login as guest**
2. **Try to access admin page** (e.g., `/admin/users`)
3. **Expected:**
   - ✅ Redirect to unauthorized page OR
   - ✅ 403 error displayed
   - ✅ Error message mentions "capabilities" not "permissions"

### Test 5.2: Expired Session
1. **Clear session cookie**
2. **Try to access protected page**
3. **Expected:**
   - ✅ Redirect to login
   - ✅ No console errors

### Test 5.3: Invalid Capability Check
Try accessing non-existent route:
```bash
curl http://localhost:3000/api/test-invalid-capability \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN"

# Should handle gracefully, not crash
```

## Part 6: Performance Testing

### Test 6.1: Page Load Time
1. **Open DevTools → Network tab**
2. **Navigate to dashboard**
3. **Check:**
   - Time to first byte (TTFB) < 500ms
   - Page fully loaded < 2s
   - No slow API calls (> 1s)

### Test 6.2: API Response Time
```bash
# Measure API performance
time curl http://localhost:3000/api/documents \
  -H "Cookie: next-auth.session-token=ADMIN_TOKEN"

# Should complete in < 500ms
```

### Test 6.3: Database Query Performance
Check server logs for slow queries:
```bash
# In terminal where dev server runs
# Look for any query taking > 100ms
# Should see: "Query capabilities for role" < 50ms
```

## Part 7: Integration Testing

### Test 7.1: Full User Flow
1. **Login as admin**
2. **Navigate to documents**
3. **Upload new document**
4. **View document** (test PDF viewer)
5. **Download document**
6. **Logout**

**Check at each step:**
- ✅ No console errors
- ✅ Capabilities checked correctly
- ✅ UI updates appropriately

### Test 7.2: Role Change Flow
1. **Admin grants new capability to user**
2. **User refreshes session** (wait 60s or manually)
3. **User sees new features**
4. **Expected:** UI updates to reflect new capabilities

### Test 7.3: Multi-Tab Testing
1. **Open app in 2 browser tabs**
2. **Login in tab 1**
3. **Tab 2 should also be authenticated** (shared session)
4. **Logout in tab 1**
5. **Tab 2 should detect logout**

## Part 8: Audit Trail Testing

### Test 8.1: Check Audit Logs
1. **Perform capability-related actions** (grant/revoke)
2. **Check audit logs:**
   ```sql
   SELECT * FROM "AuditLog" 
   WHERE action IN ('CAPABILITY_GRANT', 'CAPABILITY_REVOKE')
   ORDER BY "createdAt" DESC
   LIMIT 10;
   ```
3. **Expected:**
   - ✅ New audit actions present
   - ✅ Legacy permission actions still work

## Part 9: Browser Console Checks

Run these checks in browser console:

### Check 9.1: No Permission References
```javascript
// Search page source for "permissions"
const source = document.documentElement.outerHTML;
const permCount = (source.match(/\.permissions/g) || []).length;
console.log('Permission references in HTML:', permCount);
// Should be 0 or very low (only in comments)
```

### Check 9.2: Capability References Present
```javascript
// Search for capability usage
const capCount = (source.match(/capabilities/g) || []).length;
console.log('Capability references in HTML:', capCount);
// Should be > 10
```

## Test Results Template

For each test, record:
```
Test: [Test Name]
User: [Role tested]
Expected: [Expected behavior]
Actual: [Actual behavior]
Status: ✅ Pass / ❌ Fail / ⚠️ Warning
Notes: [Any observations]
```

## Common Issues to Watch For

1. **"Cannot read property 'capabilities' of undefined"**
   - Session not loaded properly
   - Check NextAuth configuration

2. **"Insufficient permissions" instead of "Insufficient capabilities"**
   - Old error message not updated
   - Update error text in API routes

3. **Permission Matrix shows empty data**
   - Legacy component not finding data
   - Non-critical if deprecated

4. **Slow page loads**
   - Too many capability checks
   - Check query optimization

5. **UI not updating after capability change**
   - Session not refreshing
   - Need to implement capability invalidation

## Success Criteria Checklist

- [ ] All 7 user roles can login
- [ ] Session contains capabilities (not permissions)
- [ ] API endpoints use capability checks
- [ ] UI components show/hide correctly
- [ ] No console errors during normal usage
- [ ] Performance acceptable (page load < 2s)
- [ ] Backward compatibility maintained
- [ ] Audit trail captures capability events
- [ ] Error messages use "capability" terminology
- [ ] No breaking changes for end users

## Next Steps After Testing

1. **Document all issues found**
2. **Create bug tickets for failures**
3. **Fix critical issues**
4. **Re-test after fixes**
5. **Proceed to Phase 7 (Database Cleanup)** when all critical tests pass
