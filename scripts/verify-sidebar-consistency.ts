#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

console.log('🔍 Verifying sidebar consistency across admin pages...\n')

const appDir = path.join(process.cwd(), 'src', 'app')

// Check layout.tsx exists
const adminLayoutPath = path.join(appDir, 'admin', 'layout.tsx')
if (fs.existsSync(adminLayoutPath)) {
  console.log('✅ /admin/layout.tsx exists (provides sidebar to all admin pages)')
} else {
  console.log('❌ /admin/layout.tsx NOT FOUND')
  process.exit(1)
}

// Admin pages to check
const adminPages = [
  'admin/page.tsx',
  'admin/users/page.tsx',
  'admin/roles/page.tsx',
  'admin/permissions/page.tsx',
  'admin/permissions-overview/page.tsx',
  'admin/groups/page.tsx',
  'admin/audit-logs/page.tsx',
  'admin/settings/page.tsx',
  'admin/rbac/resources/page.tsx',
  'admin/rbac/assignments/page.tsx',
]

console.log('\n📋 Checking admin pages for DashboardLayout wrappers:')
console.log('   (Should NOT have DashboardLayout - handled by layout.tsx)\n')

let hasIssues = false

for (const pagePath of adminPages) {
  const fullPath = path.join(appDir, pagePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${pagePath} - NOT FOUND`)
    continue
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const hasDashboardLayoutImport = content.includes('DashboardLayout')
  
  if (hasDashboardLayoutImport) {
    console.log(`❌ ${pagePath} - Still has DashboardLayout wrapper`)
    hasIssues = true
  } else {
    console.log(`✅ ${pagePath} - Clean (no wrapper)`)
  }
}

// Check main pages use AppSidebarUnified
console.log('\n📋 Checking main pages use AppSidebarUnified:\n')

const mainPages = [
  'dashboard/page.tsx',
  'documents/page.tsx',
]

for (const pagePath of mainPages) {
  const fullPath = path.join(appDir, pagePath)
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${pagePath} - NOT FOUND`)
    continue
  }

  const content = fs.readFileSync(fullPath, 'utf-8')
  const hasUnifiedSidebar = content.includes('AppSidebarUnified')
  const hasOldSidebar = content.includes('AppSidebar') && !content.includes('AppSidebarUnified')
  
  if (hasUnifiedSidebar && !hasOldSidebar) {
    console.log(`✅ ${pagePath} - Uses AppSidebarUnified`)
  } else if (hasOldSidebar) {
    console.log(`❌ ${pagePath} - Still uses old AppSidebar`)
    hasIssues = true
  } else {
    console.log(`❌ ${pagePath} - No sidebar component found`)
    hasIssues = true
  }
}

if (hasIssues) {
  console.log('\n❌ Found issues - please review above')
  process.exit(1)
} else {
  console.log('\n✅ All pages configured correctly!')
  console.log('\n📝 Summary:')
  console.log('   • /admin/layout.tsx provides sidebar to all admin pages')
  console.log('   • Admin pages have no duplicate DashboardLayout wrappers')
  console.log('   • Main pages use AppSidebarUnified')
  console.log('   • RBAC pages inherit sidebar from /admin/layout.tsx')
}
