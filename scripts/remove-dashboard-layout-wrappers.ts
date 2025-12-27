import * as fs from 'fs'
import * as path from 'path'

const adminPages = [
  'src/app/admin/users/page.tsx',
  'src/app/admin/roles/page.tsx',
  'src/app/admin/permissions/page.tsx',
  'src/app/admin/permissions-overview/page.tsx',
  'src/app/admin/groups/page.tsx',
  'src/app/admin/audit-logs/page.tsx',
  'src/app/admin/capabilities/page.tsx',
  'src/app/admin/workflows/page.tsx',
  'src/app/admin/settings/page.tsx',
]

function removeDashboardLayoutWrapper(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skipped (not found): ${filePath}`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  const originalContent = content

  // Remove import statement
  content = content.replace(/import\s+\{\s*DashboardLayout\s*\}\s+from\s+['"].*dashboard-layout['"][\s\n]*/g, '')

  // Remove <DashboardLayout> wrapper (opening tag)
  content = content.replace(/return\s*\(\s*<DashboardLayout>/g, 'return (')
  content = content.replace(/<DashboardLayout>\s*\n/g, '')

  // Remove closing </DashboardLayout> tag
  content = content.replace(/\s*<\/DashboardLayout>\s*\n\s*\)/g, '\n  )')
  content = content.replace(/<\/DashboardLayout>/g, '')

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`✅ Updated: ${filePath}`)
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`)
  }
}

console.log('🔧 Removing DashboardLayout wrappers from admin pages...')
console.log('   (Now handled by /admin/layout.tsx)\n')

for (const page of adminPages) {
  removeDashboardLayoutWrapper(page)
}

console.log('\n✅ Cleanup complete!')
console.log('\n📝 Summary:')
console.log('   - Removed DashboardLayout imports')
console.log('   - Removed <DashboardLayout> wrapper tags')
console.log('   - Layout now handled by /admin/layout.tsx')
