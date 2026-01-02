# Phase 5: Cleanup & Final Documentation

**Date:** January 1, 2026  
**Status:** 🚧 IN PROGRESS

---

## Cleanup Checklist

### API Routes Still Using `requireRoles()` ⚠️

Files that need migration from `requireRoles()` to `requireCapability()`:

1. **src/app/api/analytics/route.ts**
   - Current: `requireRoles(['admin', 'manager', 'ppd'])`
   - Should be: `requireCapability(request, 'USER_VIEW')`

2. **src/app/api/groups/route.ts**
   - POST: `requireRoles(['administrator'])`
   - Should be: `requireCapability(request, 'USER_MANAGE')`

3. **src/app/api/groups/[id]/permissions/route.ts**
   - GET: `requireRoles(['administrator'])`
   - POST: `requireRoles(['administrator'])`
   - Should be: `requireCapability(request, 'USER_MANAGE')`

4. **src/app/api/roles/[id]/route.ts**
   - GET: `requireRoles(['administrator', 'ppd'])`
   - PUT: `requireRoles(['administrator'])`
   - DELETE: `requireRoles(['administrator'])`
   - Should be: Various capabilities (ROLE_VIEW, ROLE_MANAGE)

### Deprecated Code to Mark or Remove

#### Functions to Deprecate (Not Remove Yet)

**src/lib/permissions.ts:**
- `requireRole(role)` - Mark @deprecated, keep for transition
- `checkApiPermission()` - Mark @deprecated, not used
- `checkApiRole()` - Mark @deprecated, not used
- `hasRole()` - Mark @deprecated, keep for transition
- `requirePermission()` - Mark @deprecated, use requireCapability

**src/lib/auth-utils.ts:**
- `requireRoles()` - Mark @deprecated after migrating 4 remaining routes
- `checkRoleAccess()` - Mark @deprecated, keep for transition
- `checkPermissionAccess()` - Mark @deprecated, not used
- `userHasRole()` - Mark @deprecated, not used
- `userHasPermission()` - Mark @deprecated, not used

**src/config/roles.ts:**
- `hasRoleAccess()` - Mark @deprecated, still used by middleware
- `hasPermission()` - Mark @deprecated, still used by middleware
- Entire ROLES config object - Keep but mark as legacy display only

#### Already Deprecated (Keep for Transition Period)

**src/hooks/use-role-visibility.tsx:**
- ✅ Already marked @deprecated
- Keep for 6-12 months transition period
- Components can migrate gradually to useCapabilities

**src/components/auth/role-guard.tsx:**
- Already wraps CapabilityGuard
- Keep for backward compatibility

### Code to Potentially Remove (After Verification)

**src/components/documents/document-viewer.tsx:**
- Already marked @deprecated
- Verify not used anywhere
- Can be archived to docs/archive/

### Files to Keep (Even if Deprecated)

These should be kept for backward compatibility during transition:

1. **src/lib/permissions.ts** - Some functions still used
2. **src/lib/auth-utils.ts** - getCurrentUser() still needed
3. **src/config/roles.ts** - ROLES config used for display
4. **src/hooks/use-role-visibility.tsx** - Gradual migration
5. **src/middleware.ts** - Already reviewed, uses capabilities where appropriate

---

## Documentation Tasks

### 1. Create Capability System README ✅

Create comprehensive guide:
- What are capabilities
- How they work
- Migration from roles
- Usage examples
- Best practices

### 2. Update Main README

Add section about:
- Authorization system overview
- Link to capability documentation
- Migration summary

### 3. Create Deployment Guide

Checklist for deploying capability system:
- Database migrations
- Environment variables
- Session updates
- Testing checklist
- Rollback procedures

### 4. Archive Old Documentation

Move to docs/archive/:
- Old role system documentation
- Phase summaries (keep references)
- Implementation plans (historical)

---

## Migration Statistics

### Current Status

| Category | Migrated | Remaining | Progress |
|----------|----------|-----------|----------|
| API Routes | 26 routes | 4 routes | 87% |
| Middleware | 2 files | 0 | 100% |
| Components | 10 files | 0 | 100% |
| Hooks | 1 new + 1 wrapped | 0 | 100% |
| Testing | 9/9 tests | 0 | 100% |

### Overall Migration Progress

- **Phase 0:** ✅ 100% Complete
- **Phase 1:** ✅ 100% Complete (26 routes)
- **Phase 2:** ✅ 100% Complete (middleware)
- **Phase 3:** ✅ 100% Complete (components)
- **Phase 4:** ✅ 100% Complete (testing)
- **Phase 5:** 🚧 60% Complete (cleanup in progress)

**Total: 92% Complete**

---

## Remaining Work

### High Priority

1. ✅ ~~Mark deprecated functions with @deprecated tags~~
2. ⏳ Migrate remaining 4 API routes to requireCapability
3. ⏳ Create CAPABILITY_SYSTEM_README.md
4. ⏳ Create DEPLOYMENT_GUIDE.md
5. ⏳ Update main README.md

### Medium Priority

6. Test all deprecated function warnings in console
7. Create migration guide for future features
8. Document capability naming conventions
9. Archive old phase documentation

### Low Priority

10. Remove truly unused code (after 6 months)
11. Create capability visualization tool
12. Add capability audit logging
13. Performance monitoring dashboard

---

## Timeline

- **Phase 5 Start:** January 1, 2026
- **Expected Completion:** January 1, 2026 (same day)
- **Migration Period:** 6-12 months for deprecated code
- **Final Cleanup:** July 2026 (remove deprecated functions)

---

## Notes

### Why Keep Deprecated Code?

1. **Gradual Migration:** Components using useRoleVisibility can migrate slowly
2. **No Breaking Changes:** Existing code continues to work
3. **Safety Net:** Easy rollback if issues found
4. **Documentation:** Shows evolution of the system

### When to Remove Deprecated Code?

- After 6 months of no usage
- When all consumers migrated
- After thorough testing in production
- With proper deprecation warnings

### Backward Compatibility Strategy

- ✅ Wrapper functions maintained
- ✅ Old APIs still functional
- ✅ Gradual deprecation warnings
- ✅ Clear migration path documented
- ✅ No forced immediate migration

---

**Last Updated:** January 1, 2026  
**Status:** Cleanup in progress, documentation being written
