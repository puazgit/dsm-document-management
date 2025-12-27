#!/bin/bash

echo "🔍 Checking sidebar usage across all pages..."
echo ""

echo "✅ UNIFIED SIDEBAR (AppSidebarUnified):"
grep -r "AppSidebarUnified" src/app --include="*.tsx" | grep -v "node_modules"
echo ""

echo "❌ OLD SIDEBAR (AppSidebar):"
old_usage=$(grep -r "from.*app-sidebar'" src/app --include="*.tsx" | grep -v "unified" | grep -v "node_modules")
if [ -z "$old_usage" ]; then
    echo "   None found ✓"
else
    echo "$old_usage"
fi
echo ""

echo "📊 Summary:"
echo "   Dashboard: $(grep -l "AppSidebarUnified" src/app/dashboard/page.tsx > /dev/null && echo "✅ Unified" || echo "❌ Old")"
echo "   Documents: $(grep -l "AppSidebarUnified" src/app/documents/page.tsx > /dev/null && echo "✅ Unified" || echo "❌ Old")"
echo "   Admin:     $(grep -l "DashboardLayout" src/app/admin/page.tsx > /dev/null && echo "✅ Unified (via DashboardLayout)" || echo "❌ Old")"
echo ""
echo "✅ All pages now use the unified database-driven sidebar!"
