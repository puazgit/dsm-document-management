import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testRolePermissions() {
  console.log('🧪 Testing Role Permissions\n')

  const rolesToTest = ['admin', 'manager', 'editor', 'viewer', 'reviewer', 'ppd', 'kadiv']

  for (const roleName of rolesToTest) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      include: {
        rolePermissions: {
          where: { isGranted: true },
          include: {
            permission: true
          }
        }
      }
    })

    if (!role) {
      console.log(`❌ Role '${roleName}' not found\n`)
      continue
    }

    const permissions = role.rolePermissions.map(rp => rp.permission.name)
    
    const summary = {
      canDownload: permissions.includes('pdf.download') || permissions.includes('documents.download'),
      canPrint: permissions.includes('pdf.print'),
      canCopy: permissions.includes('pdf.copy'),
      showWatermark: !permissions.includes('pdf.watermark')
    }

    console.log(`📋 ${role.displayName} (${roleName}):`)
    console.log(`   Total Permissions: ${permissions.length}`)
    console.log(`   PDF Permissions:`)
    console.log(`     - View: ${permissions.includes('pdf.view') ? '✅' : '❌'}`)
    console.log(`     - Download: ${summary.canDownload ? '✅' : '❌'}`)
    console.log(`     - Print: ${summary.canPrint ? '✅' : '❌'}`)
    console.log(`     - Copy: ${summary.canCopy ? '✅' : '❌'}`)
    console.log(`     - Watermark Control: ${!summary.showWatermark ? '✅' : '❌'}`)
    console.log(`   Watermark Displayed: ${summary.showWatermark ? '⚠️  YES' : '✅ NO'}`)
    console.log(`   Summary: ${JSON.stringify(summary)}`)
    console.log('')
  }

  await prisma.$disconnect()
}

testRolePermissions()
