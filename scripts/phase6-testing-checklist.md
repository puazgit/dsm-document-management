# Phase 6: Testing & Verification Checklist
**Migration: Permission → Capability System**
**Date:** 2026-01-02

## Testing Categories

### 1. Authentication & Session Testing
- [ ] Test login with admin role
- [ ] Test login with manager role
- [ ] Test login with editor role
- [ ] Test login with viewer role
- [ ] Test login with ppd.pusat role
- [ ] Test login with ppd.unit role
- [ ] Test login with guest role
- [ ] Verify `session.user.capabilities` is populated correctly
- [ ] Verify `session.user.permissions` is NOT present
- [ ] Test session refresh (capability reload after 60 seconds)

### 2. Database Verification
- [ ] Verify RoleCapabilityAssignment data exists (172 records expected)
- [ ] Verify all 7 roles have capability assignments
- [ ] Verify deprecated Permission tables still exist (backward compatibility)
- [ ] Test capability query performance
- [ ] Verify no orphaned capability assignments

### 3. API Endpoint Testing (Capability-Based)
#### Document Endpoints
- [ ] GET `/api/documents` - Test with different capabilities
- [ ] POST `/api/documents` - Test DOCUMENT_CREATE capability
- [ ] GET `/api/documents/[id]` - Test DOCUMENT_READ capability
- [ ] PUT `/api/documents/[id]` - Test DOCUMENT_UPDATE capability
- [ ] DELETE `/api/documents/[id]/archive` - Test DOCUMENT_DELETE capability
- [ ] GET `/api/documents/[id]/version/[version]` - Test PDF_VIEW capability

#### User Management Endpoints
- [ ] GET `/api/users` - Test USER_VIEW capability
- [ ] POST `/api/users` - Test USER_CREATE capability
- [ ] PUT `/api/users/[id]` - Test USER_UPDATE capability
- [ ] DELETE `/api/users/[id]` - Test USER_DELETE capability

#### Role & Capability Endpoints
- [ ] GET `/api/roles` - Test ROLE_VIEW capability
- [ ] POST `/api/roles` - Test ROLE_CREATE capability
- [ ] GET `/api/capabilities` - Test CAPABILITY_VIEW
- [ ] POST `/api/roles/[id]/capabilities` - Test capability assignment

#### Debug Endpoints
- [ ] GET `/api/debug-permissions` - Should return capabilities, not permissions
- [ ] Verify response structure changed from permissions to capabilities

### 4. UI Component Testing
#### Capability-Based Components
- [ ] Test `useCapabilities()` hook returns correct capabilities
- [ ] Test `CapabilityGuard` component shows/hides correctly
- [ ] Test PDF viewer with PDF_DOWNLOAD, PDF_PRINT, PDF_COPY capabilities
- [ ] Test document list with DOCUMENT_VIEW capability
- [ ] Test upload button visibility with DOCUMENT_CREATE capability
- [ ] Test role-based header displays capability count

#### Legacy Components (Backward Compatibility)
- [ ] Test `useRoleVisibility()` hook still works
- [ ] Test `RoleGuard` component still works
- [ ] Test Permission Matrix UI can display legacy permissions
- [ ] Verify deprecated hooks map to capabilities correctly

### 5. Feature Toggle Testing
- [ ] Test canViewDocuments capability
- [ ] Test canCreateDocuments capability
- [ ] Test canEditDocuments capability
- [ ] Test canDeleteDocuments capability
- [ ] Test canApproveDocuments capability
- [ ] Test canManageUsers capability
- [ ] Test canViewPDF capability
- [ ] Test canDownloadPDF capability
- [ ] Test canPrintPDF capability
- [ ] Test showAdminNav visibility
- [ ] Test showUploadButton visibility

### 6. Navigation & Visibility Testing
- [ ] Admin role sees admin navigation
- [ ] Manager role sees management features
- [ ] Viewer role sees read-only interface
- [ ] Guest role has minimal navigation
- [ ] Feature toggles work across all pages
- [ ] Conditional rendering based on capabilities

### 7. Audit Trail Testing
- [ ] Test `capabilityGranted()` creates CAPABILITY_GRANT log
- [ ] Test `capabilityRevoked()` creates CAPABILITY_REVOKE log
- [ ] Verify legacy `permissionGranted()` still creates log (deprecated)
- [ ] Check audit logs contain both capability and permission events
- [ ] Verify audit trail completeness

### 8. Error Handling & Edge Cases
- [ ] Test unauthorized access (no capabilities)
- [ ] Test insufficient capability error messages
- [ ] Test expired session behavior
- [ ] Test capability refresh mechanism
- [ ] Test role change → capability refresh
- [ ] Test deleted capability handling
- [ ] Test null/undefined capability checks

### 9. Performance Testing
- [ ] Measure JWT token size with capabilities
- [ ] Test capability check performance (< 1ms expected)
- [ ] Test session load time
- [ ] Test database query performance for capabilities
- [ ] Verify no N+1 query issues
- [ ] Test caching effectiveness

### 10. Integration Testing
- [ ] Test full user flow: Login → Navigate → Perform Action → Logout
- [ ] Test role assignment → capability update → session refresh
- [ ] Test capability grant → UI update
- [ ] Test multi-role user scenarios
- [ ] Test capability revocation → access denied

### 11. Backward Compatibility Testing
- [ ] Test deprecated functions still work
- [ ] Test legacy API endpoints function correctly
- [ ] Test Permission Matrix UI displays data
- [ ] Test old components using `hasPermission()` work
- [ ] Verify no breaking changes for existing code

### 12. Security Testing
- [ ] Test capability spoofing protection
- [ ] Test JWT token tampering detection
- [ ] Test SQL injection in capability queries
- [ ] Test XSS in capability names
- [ ] Test authorization bypass attempts
- [ ] Test capability enumeration protection

## Test Execution Order

1. **Database Verification** (5 min)
2. **Authentication & Session** (10 min)
3. **API Endpoints** (20 min)
4. **UI Components** (15 min)
5. **Feature Toggles** (10 min)
6. **Navigation & Visibility** (10 min)
7. **Error Handling** (10 min)
8. **Audit Trail** (10 min)
9. **Performance** (10 min)
10. **Integration** (20 min)
11. **Backward Compatibility** (15 min)
12. **Security** (15 min)

**Total Estimated Time:** 2-3 hours

## Test Data Required

### User Accounts (All Roles)
- admin@example.com (admin role, 69 capabilities)
- manager@example.com (manager role, 22 capabilities)
- editor@example.com (editor role, 10 capabilities)
- viewer@example.com (viewer role, 18 capabilities)
- ppd.pusat@example.com (ppd.pusat role, 29 capabilities)
- ppd.unit@example.com (ppd.unit role, 21 capabilities)
- guest@example.com (guest role, 3 capabilities)

### Test Documents
- Document with public access
- Document with restricted access
- Document with version history
- PDF document for viewer testing

## Success Criteria
- ✅ All 7 user roles can log in successfully
- ✅ Capabilities are loaded correctly in session
- ✅ All API endpoints use capability checks
- ✅ UI components show/hide based on capabilities
- ✅ No TypeScript or runtime errors
- ✅ Performance within acceptable limits (< 100ms API response)
- ✅ 100% backward compatibility maintained
- ✅ Audit trail captures all capability changes
- ✅ Security tests pass (no bypass, no spoofing)

## Failure Criteria
- ❌ Any user cannot log in
- ❌ Capabilities not loaded in session
- ❌ API endpoint returns incorrect authorization
- ❌ UI component displays incorrectly
- ❌ Performance degradation > 50%
- ❌ Security vulnerability discovered
- ❌ Breaking change introduced

## Testing Tools
- Manual testing via browser
- Postman/Thunder Client for API testing
- Browser DevTools for session inspection
- Prisma Studio for database verification
- Custom test scripts (automated)

## Notes
- Test in development environment first
- Document all issues found
- Create bug reports for failures
- Verify fixes before proceeding
- Keep testing report updated
