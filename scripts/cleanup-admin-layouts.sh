#!/bin/bash

echo "🔧 Removing DashboardLayout wrappers from admin pages..."
echo "   (Now handled by /admin/layout.tsx)"
echo ""

files=(
  "src/app/admin/permissions/page.tsx"
  "src/app/admin/permissions-overview/page.tsx"
  "src/app/admin/users/page.tsx"
  "src/app/admin/audit-logs/page.tsx"
  "src/app/admin/roles/page.tsx"
  "src/app/admin/groups/page.tsx"
  "src/app/admin/capabilities/page.tsx"
  "src/app/admin/workflows/page.tsx"
  "src/app/admin/settings/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📄 Processing: $file"
    
    # Remove import statement
    sed -i '' "/import.*DashboardLayout.*from/d" "$file"
    
    # Count occurrences
    count=$(grep -c "DashboardLayout>" "$file" 2>/dev/null || echo "0")
    
    if [ "$count" != "0" ]; then
      echo "   ⚠️  Still contains $count DashboardLayout references - needs manual review"
    else
      echo "   ✅ Import removed"
    fi
  else
    echo "⏭️  Skipped (not found): $file"
  fi
done

echo ""
echo "✅ Import cleanup complete!"
echo ""
echo "⚠️  Note: You need to manually remove <DashboardLayout> wrapper tags"
echo "   from the return statement of each file if they exist."
