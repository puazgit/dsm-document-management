import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPDFPermissionSource() {
  console.log('🔍 CHECKING PDF PERMISSION SOURCE')
  console.log('=' .repeat(80))
  console.log('Question: Apakah setting PDF permissions diambil dari database?\n')
  
  try {
    // Check if PDF permissions exist in database
    const pdfPermissions = await prisma.permission.findMany({
      where: {
        OR: [
          { module: 'pdf' },
          { name: { startsWith: 'pdf.' } },
          { name: { contains: 'PDF' } }
        ]
      }
    })
    
    console.log('📊 ANSWER:')
    console.log('-'.repeat(80))
    
    if (pdfPermissions.length > 0) {
      console.log('✅ YES - PDF permissions EXIST in database!')
      console.log(`   Found ${pdfPermissions.length} PDF permission(s) in database:\n`)
      
      pdfPermissions.forEach(perm => {
        console.log(`   • ${perm.name} (${perm.displayName})`)
        console.log(`     Module: ${perm.module}`)
        console.log(`     Action: ${perm.action}`)
      })
      
      console.log('\n   BUT CURRENTLY NOT USED! ⚠️')
      console.log('   The system uses HARDCODED permissions in frontend code.')
    } else {
      console.log('❌ NO - PDF permissions NOT FOUND in database')
      console.log('   The system uses HARDCODED permissions in frontend code.')
    }
    
    console.log('\n\n🏗️  CURRENT ARCHITECTURE:')
    console.log('=' .repeat(80))
    console.log('\n1. HARDCODED APPROACH (Currently Used)')
    console.log('   Location: /src/components/documents/simple-pdf-viewer.tsx')
    console.log('   Lines: 44-51')
    console.log('')
    console.log('   const rolePermissions = {')
    console.log('     "admin": { canDownload: true, canPrint: true, ... },')
    console.log('     "manager": { canDownload: true, canPrint: true, ... },')
    console.log('     "viewer": { canDownload: false, canPrint: false, ... }')
    console.log('   }')
    console.log('')
    console.log('   ✅ Advantages:')
    console.log('      • Fast - no database query needed')
    console.log('      • Simple - easy to understand')
    console.log('      • Reliable - no database dependency')
    console.log('')
    console.log('   ❌ Disadvantages:')
    console.log('      • Must redeploy to change permissions')
    console.log('      • No admin UI to manage permissions')
    console.log('      • Hardcoded in code')
    
    console.log('\n\n2. DATABASE APPROACH (Prepared but not connected)')
    console.log('   Table: permissions')
    console.log('   Table: role_permissions')
    console.log('   Admin UI: /admin/pdf-permissions (exists!)')
    console.log('')
    console.log('   ✅ Advantages:')
    console.log('      • Dynamic - change without redeploy')
    console.log('      • Admin UI available')
    console.log('      • Centralized permission management')
    console.log('')
    console.log('   ❌ Disadvantages:')
    console.log('      • Requires database query')
    console.log('      • More complex')
    console.log('      • Need caching for performance')
    
    console.log('\n\n🔄 HYBRID ARCHITECTURE RECOMMENDATION:')
    console.log('=' .repeat(80))
    console.log('\nBest practice: Use BOTH approaches')
    console.log('')
    console.log('1. Store in Database')
    console.log('   • Permissions stored in role_permissions table')
    console.log('   • Manageable via admin UI at /admin/pdf-permissions')
    console.log('')
    console.log('2. Cache on Frontend')
    console.log('   • Load permissions once during session')
    console.log('   • Store in session/context')
    console.log('   • Fallback to hardcoded if database unavailable')
    console.log('')
    console.log('3. Implementation:')
    console.log('   • Check database first')
    console.log('   • If not found → use hardcoded defaults')
    console.log('   • Cache for performance')
    
    // Check if role_permissions exist
    console.log('\n\n📋 CHECKING ROLE_PERMISSIONS TABLE:')
    console.log('-'.repeat(80))
    
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        permission: {
          OR: [
            { module: 'pdf' },
            { name: { startsWith: 'pdf.' } }
          ]
        }
      },
      include: {
        role: true,
        permission: true
      }
    })
    
    if (rolePermissions.length > 0) {
      console.log(`✅ Found ${rolePermissions.length} PDF role-permission mapping(s) in database:\n`)
      
      const groupedByRole = rolePermissions.reduce((acc, rp) => {
        const roleName = rp.role.name
        if (!acc[roleName]) {
          acc[roleName] = []
        }
        acc[roleName]!.push({
          permission: rp.permission.name,
          granted: rp.isGranted
        })
        return acc
      }, {} as Record<string, Array<{permission: string, granted: boolean}>>)
      
      Object.entries(groupedByRole).forEach(([roleName, perms]) => {
        console.log(`   Role: ${roleName}`)
        perms.forEach(p => {
          console.log(`      ${p.granted ? '✅' : '❌'} ${p.permission}`)
        })
        console.log('')
      })
    } else {
      console.log('❌ No PDF permissions assigned to roles in database')
      console.log('   This confirms the system uses HARDCODED permissions')
    }
    
    // Check capabilities
    console.log('\n\n🔑 CHECKING CAPABILITIES (Alternative Approach):')
    console.log('-'.repeat(80))
    
    const docCapabilities = await prisma.roleCapability.findMany({
      where: {
        name: {
          startsWith: 'DOCUMENT_'
        }
      }
    })
    
    if (docCapabilities.length > 0) {
      console.log(`✅ Found ${docCapabilities.length} document capability(ies):\n`)
      
      docCapabilities.forEach(cap => {
        console.log(`   • ${cap.name}`)
        console.log(`     Category: ${cap.category}`)
      })
      
      console.log('\n   NOTE: These are for DOCUMENT ACCESS, not PDF-specific controls')
      console.log('   (e.g., DOCUMENT_VIEW allows viewing, but not controlling download/print)')
    }
    
    // Final recommendation
    console.log('\n\n💡 RECOMMENDATIONS:')
    console.log('=' .repeat(80))
    console.log('\nCURRENT STATE:')
    console.log('   • PDF permissions: HARDCODED in frontend ❌')
    console.log('   • Document access: Database (capabilities) ✅')
    console.log('   • Admin UI: Available but not connected ⚠️')
    
    console.log('\nTO ENABLE DATABASE-DRIVEN PDF PERMISSIONS:')
    console.log('\n1. Create PDF permissions in database:')
    console.log('   • pdf.view, pdf.download, pdf.print, pdf.copy, pdf.watermark')
    console.log('   • Run: npx ts-node scripts/setup-pdf-permissions.ts (need to create)')
    
    console.log('\n2. Modify simple-pdf-viewer.tsx:')
    console.log('   • Add API call to fetch permissions')
    console.log('   • Use database permissions instead of hardcoded')
    console.log('   • Keep hardcoded as fallback')
    
    console.log('\n3. Connect admin UI:')
    console.log('   • Link /admin/pdf-permissions to database')
    console.log('   • Test permission changes reflect in viewer')
    
    console.log('\nOR KEEP CURRENT APPROACH:')
    console.log('   • If permissions rarely change → hardcoded is fine')
    console.log('   • Simple and performant')
    console.log('   • Easy to understand and maintain')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkPDFPermissionSource()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
