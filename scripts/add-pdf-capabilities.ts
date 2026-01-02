#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addPDFCapabilities() {
  console.log('🔧 Adding PDF Capabilities to Database...\n')
  
  const pdfCapabilities = [
    {
      name: 'PDF_VIEW',
      description: 'View PDF documents',
      category: 'document',
    },
    {
      name: 'PDF_DOWNLOAD',
      description: 'Download PDF documents',
      category: 'document',
    },
    {
      name: 'PDF_PRINT',
      description: 'Print PDF documents',
      category: 'document',
    },
    {
      name: 'PDF_COPY',
      description: 'Copy content from PDF documents',
      category: 'document',
    },
    {
      name: 'PDF_WATERMARK',
      description: 'Control PDF watermark settings',
      category: 'document',
    },
  ]
  
  // 1. Add capabilities to database
  console.log('📝 Step 1: Adding capabilities...')
  for (const cap of pdfCapabilities) {
    const capability = await prisma.roleCapability.upsert({
      where: { name: cap.name },
      update: {
        description: cap.description,
        category: cap.category,
      },
      create: cap,
    })
    console.log(`   ✅ ${cap.name}`)
  }
  
  // 2. Assign to appropriate roles
  console.log('\n📝 Step 2: Assigning capabilities to roles...')
  
  const roles = await prisma.role.findMany({
    where: {
      name: { in: ['administrator', 'manager', 'editor', 'viewer'] }
    }
  })
  
  const adminRole = roles.find(r => r.name === 'administrator')
  const managerRole = roles.find(r => r.name === 'manager')
  const editorRole = roles.find(r => r.name === 'editor')
  const viewerRole = roles.find(r => r.name === 'viewer')
  
  // Admin gets all PDF capabilities
  if (adminRole) {
    console.log('\n   👑 Administrator:')
    for (const capName of ['PDF_VIEW', 'PDF_DOWNLOAD', 'PDF_PRINT', 'PDF_COPY', 'PDF_WATERMARK']) {
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capName }
      })
      
      if (capability) {
        await prisma.roleCapabilityAssignment.upsert({
          where: {
            roleId_capabilityId: {
              roleId: adminRole.id,
              capabilityId: capability.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            capabilityId: capability.id
          }
        })
        console.log(`      ✅ ${capName}`)
      }
    }
  }
  
  // Manager gets view, download, print (no copy, no watermark control)
  if (managerRole) {
    console.log('\n   👨‍💼 Manager:')
    for (const capName of ['PDF_VIEW', 'PDF_DOWNLOAD', 'PDF_PRINT']) {
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capName }
      })
      
      if (capability) {
        await prisma.roleCapabilityAssignment.upsert({
          where: {
            roleId_capabilityId: {
              roleId: managerRole.id,
              capabilityId: capability.id
            }
          },
          update: {},
          create: {
            roleId: managerRole.id,
            capabilityId: capability.id
          }
        })
        console.log(`      ✅ ${capName}`)
      }
    }
  }
  
  // Editor gets view and download only
  if (editorRole) {
    console.log('\n   ✏️  Editor:')
    for (const capName of ['PDF_VIEW', 'PDF_DOWNLOAD']) {
      const capability = await prisma.roleCapability.findUnique({
        where: { name: capName }
      })
      
      if (capability) {
        await prisma.roleCapabilityAssignment.upsert({
          where: {
            roleId_capabilityId: {
              roleId: editorRole.id,
              capabilityId: capability.id
            }
          },
          update: {},
          create: {
            roleId: editorRole.id,
            capabilityId: capability.id
          }
        })
        console.log(`      ✅ ${capName}`)
      }
    }
  }
  
  // Viewer gets view only
  if (viewerRole) {
    console.log('\n   👁️  Viewer:')
    const capability = await prisma.roleCapability.findUnique({
      where: { name: 'PDF_VIEW' }
    })
    
    if (capability) {
      await prisma.roleCapabilityAssignment.upsert({
        where: {
          roleId_capabilityId: {
            roleId: viewerRole.id,
            capabilityId: capability.id
          }
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          capabilityId: capability.id
        }
      })
      console.log(`      ✅ PDF_VIEW`)
    }
  }
  
  console.log('\n✅ PDF Capabilities added and assigned successfully!')
  console.log('\n📋 Summary:')
  console.log('   • Administrator: All PDF capabilities (view, download, print, copy, watermark)')
  console.log('   • Manager: View, download, print')
  console.log('   • Editor: View, download')
  console.log('   • Viewer: View only')
  console.log('\n💡 Next steps:')
  console.log('   1. Logout and login again to get new capabilities')
  console.log('   2. Check /admin/rbac/assignments to verify assignments')
  console.log('   3. Test PDF features with different roles')
}

addPDFCapabilities()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
