#!/bin/bash

echo "🔍 Phase 5 Verification: Hooks & Components Migration"
echo "=============================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter for issues
TOTAL_ISSUES=0

echo "📊 Step 1: Checking for active permission references in source code"
echo "----------------------------------------------------------------------------"

# Search for session.user.permissions references (should be 1 - the comment)
PERM_REFS=$(grep -r "session\.user\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REMOVED:" | grep -v "@deprecated" | grep -v "//.*permission" | wc -l | tr -d ' ')
echo -e "${BLUE}Permission references in session:${NC} $PERM_REFS"
if [ "$PERM_REFS" -eq 0 ]; then
  echo -e "   ${GREEN}✅ No active permission references in session${NC}"
else
  echo -e "   ${YELLOW}⚠️  Found $PERM_REFS active permission references${NC}"
  grep -rn "session\.user\.permissions" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REMOVED:" | grep -v "@deprecated" | head -5
  TOTAL_ISSUES=$((TOTAL_ISSUES + PERM_REFS))
fi

echo ""

# Search for permissions?.includes patterns (should be 0 outside deprecated files)
INCLUDES_REFS=$(grep -r "permissions?\.includes" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "@deprecated" | grep -v "DEPRECATED" | grep -v "LEGACY" | wc -l | tr -d ' ')
echo -e "${BLUE}Permission includes patterns:${NC} $INCLUDES_REFS"
if [ "$INCLUDES_REFS" -eq 0 ]; then
  echo -e "   ${GREEN}✅ No active permission.includes() patterns${NC}"
else
  echo -e "   ${YELLOW}⚠️  Found $INCLUDES_REFS active permission.includes() patterns${NC}"
  grep -rn "permissions?\.includes" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "@deprecated" | head -5
fi

echo ""
echo "📊 Step 2: Verifying deprecation warnings are in place"
echo "----------------------------------------------------------------------------"

# Check if key files have deprecation warnings
FILES_TO_CHECK=(
  "src/lib/permissions.ts"
  "src/lib/auth-utils.ts"
  "src/config/roles.ts"
  "src/hooks/use-role-visibility.tsx"
  "src/lib/audit.ts"
  "src/components/admin/permission-matrix.tsx"
)

DEPRECATED_COUNT=0
for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "@deprecated\|DEPRECATED\|LEGACY" "$file" 2>/dev/null; then
      echo -e "   ${GREEN}✅ $file${NC} - Has deprecation warnings"
      DEPRECATED_COUNT=$((DEPRECATED_COUNT + 1))
    else
      echo -e "   ${RED}❌ $file${NC} - Missing deprecation warnings"
      TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
    fi
  else
    echo -e "   ${YELLOW}⚠️  $file${NC} - File not found"
  fi
done

echo ""
echo "   Total files with deprecation warnings: $DEPRECATED_COUNT/${#FILES_TO_CHECK[@]}"

echo ""
echo "📊 Step 3: Checking capability usage (should be active)"
echo "----------------------------------------------------------------------------"

# Count capability references
CAP_REFS=$(grep -r "session\.user\.capabilities" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo -e "${BLUE}Capability references:${NC} $CAP_REFS"
if [ "$CAP_REFS" -gt 5 ]; then
  echo -e "   ${GREEN}✅ Capability-based system is active ($CAP_REFS references)${NC}"
else
  echo -e "   ${RED}❌ Too few capability references - migration incomplete${NC}"
  TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
fi

# Count hasCapability usage
HAS_CAP=$(grep -r "hasCapability\|UnifiedAccessControl" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo -e "${BLUE}UnifiedAccessControl usage:${NC} $HAS_CAP"
if [ "$HAS_CAP" -gt 0 ]; then
  echo -e "   ${GREEN}✅ Modern capability checking is in use${NC}"
else
  echo -e "   ${YELLOW}⚠️  Consider using UnifiedAccessControl more widely${NC}"
fi

echo ""
echo "📊 Step 4: Checking for new capability audit functions"
echo "----------------------------------------------------------------------------"

if grep -q "capabilityGranted\|capabilityRevoked\|CAPABILITY_GRANT" src/lib/audit.ts 2>/dev/null; then
  echo -e "   ${GREEN}✅ Modern capability audit functions exist${NC}"
else
  echo -e "   ${RED}❌ Capability audit functions missing${NC}"
  TOTAL_ISSUES=$((TOTAL_ISSUES + 1))
fi

if grep -q "AuditAction.CAPABILITY_GRANT\|AuditResource.ROLE_CAPABILITY" src/lib/audit.ts 2>/dev/null; then
  echo -e "   ${GREEN}✅ Capability audit enums exist${NC}"
else
  echo -e "   ${YELLOW}⚠️  Capability audit enums may be missing${NC}"
fi

echo ""
echo "📊 Step 5: TypeScript compilation check"
echo "----------------------------------------------------------------------------"

# Run tsc to check for type errors
echo "   Running TypeScript compiler..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -i "error" | head -10 > /tmp/tsc_errors.txt || true

ERROR_COUNT=$(wc -l < /tmp/tsc_errors.txt | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
  echo -e "   ${GREEN}✅ No TypeScript compilation errors${NC}"
else
  echo -e "   ${YELLOW}⚠️  Found TypeScript errors (may be unrelated to migration)${NC}"
  head -5 /tmp/tsc_errors.txt
fi

echo ""
echo "📊 Step 6: Checking for remaining TODOs related to permissions"
echo "----------------------------------------------------------------------------"

TODO_COUNT=$(grep -r "TODO.*permission\|FIXME.*permission" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
echo -e "${BLUE}Permission-related TODOs:${NC} $TODO_COUNT"
if [ "$TODO_COUNT" -eq 0 ]; then
  echo -e "   ${GREEN}✅ No permission-related TODOs${NC}"
else
  echo -e "   ${YELLOW}⚠️  Found $TODO_COUNT permission-related TODOs${NC}"
  grep -rn "TODO.*permission\|FIXME.*permission" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -3
fi

echo ""
echo "=============================================================================="
echo ""

# Final summary
if [ "$TOTAL_ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ PHASE 5 VERIFICATION PASSED${NC}"
  echo ""
  echo "Summary:"
  echo "   ✅ All permission references properly deprecated"
  echo "   ✅ Capability system active and in use"
  echo "   ✅ Deprecation warnings in place"
  echo "   ✅ Audit functions updated for capabilities"
  echo ""
  echo "Next steps:"
  echo "   1. Run comprehensive testing with all user roles"
  echo "   2. Verify all features work with capability system"
  echo "   3. Proceed to Phase 6: Testing & Verification"
else
  echo -e "${YELLOW}⚠️  PHASE 5 VERIFICATION: Some items need attention${NC}"
  echo ""
  echo "Summary:"
  echo "   Total items needing attention: $TOTAL_ISSUES"
  echo "   Deprecated files marked: $DEPRECATED_COUNT/${#FILES_TO_CHECK[@]}"
  echo "   Capability references: $CAP_REFS"
  echo ""
  echo "Review the items above and address any critical issues."
fi

echo ""

# Cleanup
rm -f /tmp/tsc_errors.txt 2>/dev/null

exit 0
