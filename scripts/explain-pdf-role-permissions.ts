import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define PDF permission matrix by role
interface PDFPermissions {
  canDownload: boolean
  canPrint: boolean
  canCopy: boolean
  showWatermark: boolean
  blockRightClick: boolean
  blockKeyboardShortcuts: boolean
  blockTextSelection: boolean
  blockPrintScreen: boolean
}

const PDF_ROLE_PERMISSIONS: Record<string, PDFPermissions> = {
  // Full Access - No Restrictions
  'admin': {
    canDownload: true,
    canPrint: true,
    canCopy: true,
    showWatermark: false,
    blockRightClick: false,
    blockKeyboardShortcuts: false,
    blockTextSelection: false,
    blockPrintScreen: false
  },
  
  // PPD (Petugas Pengendali Dokumen) - Full Access
  'ppd.pusat': {
    canDownload: true,
    canPrint: true,
    canCopy: true,
    showWatermark: false,
    blockRightClick: false,
    blockKeyboardShortcuts: false,
    blockTextSelection: false,
    blockPrintScreen: false
  },
  
  'ppd.unit': {
    canDownload: true,
    canPrint: true,
    canCopy: true,
    showWatermark: false,
    blockRightClick: false,
    blockKeyboardShortcuts: false,
    blockTextSelection: false,
    blockPrintScreen: false
  },
  
  // Manager - Can download & print, but not copy
  'manager': {
    canDownload: true,
    canPrint: true,
    canCopy: false,
    showWatermark: false,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    blockPrintScreen: false
  },
  
  // Kadiv - Can download, but not print or copy
  'kadiv': {
    canDownload: true,
    canPrint: false,
    canCopy: false,
    showWatermark: false,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    blockPrintScreen: true
  },
  
  // Editor - Can print, but not download or copy
  'editor': {
    canDownload: false,
    canPrint: true,
    canCopy: false,
    showWatermark: false,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    blockPrintScreen: true
  },
  
  // Viewer - View only, with watermark
  'viewer': {
    canDownload: false,
    canPrint: false,
    canCopy: false,
    showWatermark: true,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    blockPrintScreen: true
  },
  
  // Guest - Most restricted
  'guest': {
    canDownload: false,
    canPrint: false,
    canCopy: false,
    showWatermark: true,
    blockRightClick: true,
    blockKeyboardShortcuts: true,
    blockTextSelection: true,
    blockPrintScreen: true
  }
}

async function explainPDFRolePermissions() {
  console.log('📄 PDF ROLE-BASED PERMISSIONS SYSTEM')
  console.log('=' .repeat(80))
  console.log('This system controls what users can do with PDF documents based on their role')
  console.log('')
  
  try {
    // Get all roles
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      select: {
        name: true,
        displayName: true,
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    console.log('🎭 ROLE PERMISSIONS MATRIX')
    console.log('-'.repeat(80))
    console.log('Role              | Download | Print | Copy | Watermark | Security')
    console.log('-'.repeat(80))
    
    for (const role of roles) {
      const permissions = PDF_ROLE_PERMISSIONS[role.name] || PDF_ROLE_PERMISSIONS['viewer']
      if (!permissions) continue
      
      const userCount = role._count.userRoles
      
      const download = permissions.canDownload ? '✅' : '❌'
      const print = permissions.canPrint ? '✅' : '❌'
      const copy = permissions.canCopy ? '✅' : '❌'
      const watermark = permissions.showWatermark ? '🔒' : '⚪'
      const security = permissions.blockRightClick ? '🛡️ ' : '  '
      
      const roleName = role.name.padEnd(17)
      console.log(`${roleName} | ${download}       | ${print}  | ${copy}  | ${watermark}         | ${security} (${userCount} users)`)
    }
    
    console.log('')
    console.log('Legend:')
    console.log('  ✅ = Allowed')
    console.log('  ❌ = Blocked')
    console.log('  🔒 = Watermark shown')
    console.log('  🛡️  = Enhanced security (right-click blocked, keyboard shortcuts blocked)')
    
    // Detailed permissions per role
    console.log('\n\n📋 DETAILED PERMISSIONS PER ROLE')
    console.log('=' .repeat(80))
    
    for (const [roleName, permissions] of Object.entries(PDF_ROLE_PERMISSIONS)) {
      const role = roles.find(r => r.name === roleName)
      if (!role) continue
      
      console.log(`\n🎭 ${role.displayName} (${roleName})`)
      console.log('-'.repeat(80))
      console.log(`   Users with this role: ${role._count.userRoles}`)
      console.log(`\n   PDF Actions:`)
      console.log(`      Download PDF: ${permissions.canDownload ? '✅ Allowed' : '❌ Blocked'}`)
      console.log(`      Print PDF: ${permissions.canPrint ? '✅ Allowed' : '❌ Blocked'}`)
      console.log(`      Copy Text: ${permissions.canCopy ? '✅ Allowed' : '❌ Blocked'}`)
      console.log(`      Watermark: ${permissions.showWatermark ? '🔒 Yes (shows user info)' : '⚪ No'}`)
      
      console.log(`\n   Security Measures:`)
      console.log(`      Block Right-Click: ${permissions.blockRightClick ? '✅ Active' : '❌ Inactive'}`)
      console.log(`      Block Keyboard Shortcuts: ${permissions.blockKeyboardShortcuts ? '✅ Active (Ctrl+P, Ctrl+S, etc)' : '❌ Inactive'}`)
      console.log(`      Block Text Selection: ${permissions.blockTextSelection ? '✅ Active (Ctrl+C, Ctrl+A blocked)' : '❌ Inactive'}`)
      console.log(`      Block Print Screen: ${permissions.blockPrintScreen ? '✅ Active' : '❌ Inactive'}`)
    }
    
    // Implementation details
    console.log('\n\n🔧 HOW IT WORKS')
    console.log('=' .repeat(80))
    console.log('\n1. ROLE DETECTION')
    console.log('   • System checks user\'s role from session')
    console.log('   • Role determines PDF permissions via rolePermissions matrix')
    console.log('   • File: /src/components/documents/simple-pdf-viewer.tsx')
    
    console.log('\n2. PERMISSION ENFORCEMENT')
    console.log('   • Frontend: Buttons (Download, Print) shown/hidden based on permissions')
    console.log('   • Security Hook: use-security-measures.ts blocks actions')
    console.log('   • Backend: API validates permissions before serving file')
    
    console.log('\n3. SECURITY MEASURES')
    console.log('   A. Right-Click Protection')
    console.log('      • Blocks context menu on PDF viewer')
    console.log('      • Prevents "Save Image As"')
    
    console.log('\n   B. Keyboard Shortcuts Protection')
    console.log('      • Blocks: Ctrl+P (print), Ctrl+S (save), F12 (devtools)')
    console.log('      • Blocks: Ctrl+C (copy), Ctrl+A (select all) if blockTextSelection')
    console.log('      • Blocks: PrintScreen key if blockPrintScreen')
    
    console.log('\n   C. Watermark')
    console.log('      • Shown for viewer/guest roles')
    console.log('      • Contains: User email, timestamp, document ID')
    console.log('      • Cannot be removed by client-side')
    
    console.log('\n   D. DevTools Detection')
    console.log('      • Detects when browser DevTools is opened')
    console.log('      • Logs security violation')
    console.log('      • Can blur content or show warning')
    
    console.log('\n4. ACTIVITY LOGGING')
    console.log('   • All security violations are logged')
    console.log('   • View, Download, Print actions tracked')
    console.log('   • Audit trail available at /admin/audit-logs')
    
    // Configuration
    console.log('\n\n⚙️  CONFIGURATION')
    console.log('=' .repeat(80))
    console.log('\n1. MODIFY ROLE PERMISSIONS')
    console.log('   File: /src/components/documents/simple-pdf-viewer.tsx')
    console.log('   Edit the rolePermissions object (lines 44-51)')
    console.log('')
    console.log('   Example:')
    console.log('   ```typescript')
    console.log('   const rolePermissions = {')
    console.log('     "manager": {')
    console.log('       canDownload: true,  // Allow download')
    console.log('       canPrint: true,     // Allow print')
    console.log('       canCopy: false,     // Block copy')
    console.log('       showWatermark: false // No watermark')
    console.log('     }')
    console.log('   }')
    console.log('   ```')
    
    console.log('\n2. WATERMARK TEXT')
    console.log('   File: /src/lib/config.ts')
    console.log('   Or set environment variable: WATERMARK_TEXT="CONFIDENTIAL"')
    
    console.log('\n3. SECURITY HOOK SETTINGS')
    console.log('   File: /src/hooks/use-security-measures.ts')
    console.log('   Usage in component:')
    console.log('   ```typescript')
    console.log('   useSecurityMeasures({')
    console.log('     blockRightClick: true,')
    console.log('     blockKeyboardShortcuts: true,')
    console.log('     blockTextSelection: true,')
    console.log('     blockPrintScreen: true,')
    console.log('     detectDevTools: true')
    console.log('   })')
    console.log('   ```')
    
    // Best practices
    console.log('\n\n💡 BEST PRACTICES')
    console.log('=' .repeat(80))
    console.log('\n✅ DO:')
    console.log('   • Give admin/ppd full access for document management')
    console.log('   • Use watermarks for guest/viewer roles')
    console.log('   • Log all security violations for audit')
    console.log('   • Test permissions after role changes')
    console.log('   • Inform users about restrictions (show badges)')
    
    console.log('\n❌ DON\'T:')
    console.log('   • Rely only on frontend restrictions (always validate backend)')
    console.log('   • Block accessibility features unnecessarily')
    console.log('   • Remove security logging')
    console.log('   • Give guest role download permissions')
    
    // Security notes
    console.log('\n\n⚠️  SECURITY NOTES')
    console.log('=' .repeat(80))
    console.log('\n1. Frontend restrictions can be bypassed')
    console.log('   → Always validate permissions on backend API')
    console.log('   → File: /src/app/api/documents/[id]/download/route.ts')
    
    console.log('\n2. Users can still screenshot')
    console.log('   → Print Screen blocking is best-effort')
    console.log('   → Watermarks help identify source of leaks')
    
    console.log('\n3. PDF.js library limitations')
    console.log('   → Cannot prevent browser\'s built-in PDF viewer')
    console.log('   → Serve PDFs inline with proper headers')
    
    console.log('\n4. Recommended additional measures:')
    console.log('   → Use DRM for highly sensitive documents')
    console.log('   → Implement session timeout')
    console.log('   → Monitor for unusual download patterns')
    console.log('   → Regular security audits')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

explainPDFRolePermissions()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
