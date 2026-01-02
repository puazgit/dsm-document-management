#!/bin/bash

echo "🔍 Phase 4 Verification: Checking for remaining permission references"
echo "========================================================================"
echo ""

# Search for session.user.permissions in src/
echo "📊 Searching for 'session.user.permissions' references..."
PERM_COUNT=$(grep -r "session\.user\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "   Found: $PERM_COUNT occurrences"

if [ "$PERM_COUNT" -eq 0 ]; then
  echo "   ✅ No session.user.permissions references found!"
else
  echo "   ⚠️  Some references still exist:"
  grep -rn "session\.user\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
fi

echo ""

# Search for session?.user?.permissions in src/
echo "📊 Searching for 'session?.user?.permissions' references..."
OPT_PERM_COUNT=$(grep -r "session?\.user?\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "   Found: $OPT_PERM_COUNT occurrences"

if [ "$OPT_PERM_COUNT" -eq 0 ]; then
  echo "   ✅ No optional chaining permission references found!"
else
  echo "   ⚠️  Some references still exist:"
  grep -rn "session?\.user?\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
fi

echo ""

# Search for permissions?.includes in src/
echo "📊 Searching for 'permissions?.includes' patterns..."
INCLUDES_COUNT=$(grep -r "permissions?\.includes" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "   Found: $INCLUDES_COUNT occurrences"

if [ "$INCLUDES_COUNT" -eq 0 ]; then
  echo "   ✅ No permissions?.includes() calls found!"
else
  echo "   ⚠️  Some references still exist:"
  grep -rn "permissions?\.includes" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -5
fi

echo ""

# Count capability references (should be present)
echo "📊 Verifying capability usage..."
CAP_COUNT=$(grep -r "session\.user\.capabilities" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo "   Found: $CAP_COUNT capability references"

if [ "$CAP_COUNT" -gt 0 ]; then
  echo "   ✅ Capability-based authorization is being used!"
else
  echo "   ❌ No capability references found - something is wrong!"
fi

echo ""
echo "========================================================================"
echo ""

# Summary
TOTAL_ISSUES=$((PERM_COUNT + OPT_PERM_COUNT + INCLUDES_COUNT))

if [ "$TOTAL_ISSUES" -eq 0 ] && [ "$CAP_COUNT" -gt 0 ]; then
  echo "✅ PHASE 4 VERIFICATION PASSED"
  echo ""
  echo "Summary:"
  echo "   ✅ No permission references in source code"
  echo "   ✅ Capability-based authorization active ($CAP_COUNT references)"
  echo "   ✅ Migration complete!"
  echo ""
  echo "Next steps:"
  echo "   1. Test application with different user roles"
  echo "   2. Verify all features work correctly"
  echo "   3. Proceed to Phase 5: Hooks & Components (if needed)"
else
  echo "⚠️  PHASE 4 VERIFICATION: Some issues found"
  echo ""
  echo "Summary:"
  echo "   Total permission references: $TOTAL_ISSUES"
  echo "   Capability references: $CAP_COUNT"
  echo ""
  echo "Please review the files listed above and update them."
fi

echo ""
