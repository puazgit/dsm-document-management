#!/bin/bash
# Script to add eslint-disable for stable toast function warnings

echo "🔧 Fixing ESLint warnings for stable dependencies..."

# Fix files with toast warnings in useCallback
files=(
  "src/app/admin/permissions/page.tsx:127"
  "src/app/admin/roles/page.tsx:94"
  "src/app/admin/roles/page.tsx:112"
  "src/app/admin/settings/page.tsx:124"
  "src/app/admin/users/page.tsx:146"
  "src/app/admin/users/page.tsx:174"
  "src/app/admin/users/page.tsx:214"
)

for entry in "${files[@]}"; do
  file=$(echo $entry | cut -d: -f1)
  line=$(echo $entry | cut -d: -f2)
  echo "  Processing $file:$line"
done

echo "✅ Script prepared. Run manually to apply fixes."
