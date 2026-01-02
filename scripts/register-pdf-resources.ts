import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function registerPDFResources() {
  try {
    console.log('🔧 Registering PDF Resources...\n')

    // Check if PDF capabilities exist
    const pdfCaps = await prisma.roleCapability.findMany({
      where: {
        name: {
          contains: 'PDF'
        }
      }
    })

    if (pdfCaps.length === 0) {
      console.log('❌ No PDF capabilities found. Please run add-pdf-capabilities.ts first.')
      return
    }

    console.log(`✅ Found ${pdfCaps.length} PDF capabilities\n`)

    // PDF API Resources
    const apiResources = [
      {
        id: 'api-documents-view',
        type: 'api',
        path: '/api/documents/[id]/view',
        name: 'Document View API',
        description: 'API endpoint to view document content',
        requiredCapability: 'PDF_VIEW',
        metadata: { method: 'GET' }
      },
      {
        id: 'api-documents-version-view',
        type: 'api',
        path: '/api/documents/[id]/version/[version]',
        name: 'Document Version API',
        description: 'API endpoint to view specific document version',
        requiredCapability: 'PDF_VIEW',
        metadata: { method: 'GET' }
      },
      {
        id: 'api-documents-download',
        type: 'api',
        path: '/api/documents/[id]/download',
        name: 'Document Download API',
        description: 'API endpoint to download documents',
        requiredCapability: 'PDF_DOWNLOAD',
        metadata: { method: 'GET' }
      },
      {
        id: 'api-documents-print',
        type: 'api',
        path: '/api/documents/[id]/print',
        name: 'Document Print API',
        description: 'API endpoint for print-optimized document',
        requiredCapability: 'PDF_PRINT',
        metadata: { method: 'GET' }
      }
    ]

    // PDF Route Resources
    const routeResources = [
      {
        id: 'route-documents-view',
        type: 'route',
        path: '/documents/[id]/view',
        name: 'Document Viewer Route',
        description: 'Route to view document with PDF viewer',
        requiredCapability: 'PDF_VIEW'
      },
      {
        id: 'route-documents-detail',
        type: 'route',
        path: '/documents/[id]',
        name: 'Document Detail Route',
        description: 'Route to view document details',
        requiredCapability: 'DOCUMENT_VIEW'
      }
    ]

    console.log('📝 Creating API Resources...\n')
    
    for (const resource of apiResources) {
      const existing = await prisma.resource.findUnique({
        where: { id: resource.id }
      })

      if (existing) {
        // Update existing
        await prisma.resource.update({
          where: { id: resource.id },
          data: {
            type: resource.type,
            path: resource.path,
            name: resource.name,
            description: resource.description,
            requiredCapability: resource.requiredCapability,
            metadata: resource.metadata,
            isActive: true
          }
        })
        console.log(`   ✅ Updated: ${resource.name}`)
      } else {
        // Create new
        await prisma.resource.create({
          data: {
            id: resource.id,
            type: resource.type,
            path: resource.path,
            name: resource.name,
            description: resource.description,
            requiredCapability: resource.requiredCapability,
            metadata: resource.metadata,
            isActive: true,
            sortOrder: 0
          }
        })
        console.log(`   ✅ Created: ${resource.name}`)
      }
    }

    console.log('\n📝 Creating Route Resources...\n')
    
    for (const resource of routeResources) {
      const existing = await prisma.resource.findUnique({
        where: { id: resource.id }
      })

      if (existing) {
        // Update existing
        await prisma.resource.update({
          where: { id: resource.id },
          data: {
            type: resource.type,
            path: resource.path,
            name: resource.name,
            description: resource.description,
            requiredCapability: resource.requiredCapability,
            isActive: true
          }
        })
        console.log(`   ✅ Updated: ${resource.name}`)
      } else {
        // Create new
        await prisma.resource.create({
          data: {
            id: resource.id,
            type: resource.type,
            path: resource.path,
            name: resource.name,
            description: resource.description,
            requiredCapability: resource.requiredCapability,
            isActive: true,
            sortOrder: 0
          }
        })
        console.log(`   ✅ Created: ${resource.name}`)
      }
    }

    // Verify
    console.log('\n📊 Verification:\n')
    
    const pdfResources = await prisma.resource.findMany({
      where: {
        OR: [
          { requiredCapability: { contains: 'PDF' } },
          { path: { contains: '/documents' } }
        ],
        isActive: true
      },
      orderBy: [
        { type: 'asc' },
        { path: 'asc' }
      ]
    })

    console.log(`Total PDF/Document Resources: ${pdfResources.length}\n`)
    
    const byType = pdfResources.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} resources`)
    })

    console.log('\n✅ PDF Resources registered successfully!')
    console.log('\n💡 Next steps:')
    console.log('   1. Middleware will now check these routes')
    console.log('   2. UnifiedAccessControl.canAccessAPI() will validate API calls')
    console.log('   3. Assign PDF capabilities to roles via /admin/rbac/assignments')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

registerPDFResources()
