import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDocumentStatus() {
  try {
    console.log('=== AUDIT DOCUMENT STATUS ===\n')
    
    // Query real data dari database
    const statusCounts = await prisma.document.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    })

    console.log('📊 Real Data dari Database:')
    console.log('─────────────────────────────')
    let totalReal = 0
    statusCounts.forEach(item => {
      console.log(`${item.status.padEnd(20)} : ${item._count.id}`)
      totalReal += item._count.id
    })
    console.log(`${'TOTAL'.padEnd(20)} : ${totalReal}`)
    
    console.log('\n📈 Data yang diambil API /api/documents/stats:')
    console.log('─────────────────────────────')
    
    // Query dengan logika yang sama seperti API
    const [draft, pending, approved, archived] = await Promise.all([
      prisma.document.count({ where: { status: 'DRAFT' } }),
      prisma.document.count({ where: { status: { in: ['IN_REVIEW', 'PENDING_APPROVAL'] } } }),
      prisma.document.count({ where: { status: { in: ['APPROVED', 'PUBLISHED'] } } }),
      prisma.document.count({ where: { status: 'ARCHIVED' } }),
    ])
    
    console.log(`Draft Documents      : ${draft}`)
    console.log(`Pending Documents    : ${pending} (IN_REVIEW + PENDING_APPROVAL)`)
    console.log(`Approved Documents   : ${approved} (APPROVED + PUBLISHED)`)
    console.log(`Archived Documents   : ${archived}`)
    console.log(`${'TOTAL'.padEnd(20)} : ${draft + pending + approved + archived}`)
    
    console.log('\n🎯 Chart Component Mapping:')
    console.log('─────────────────────────────')
    console.log(`Draft       → ${draft}`)
    console.log(`Pending     → ${pending}`)
    console.log(`Approved    → ${approved}`)
    console.log(`Archived    → ${archived}`)
    
    // Breakdown status yang digabung
    console.log('\n🔍 Breakdown Detail:')
    console.log('─────────────────────────────')
    const detailedCounts = await Promise.all([
      prisma.document.count({ where: { status: 'IN_REVIEW' } }),
      prisma.document.count({ where: { status: 'PENDING_APPROVAL' } }),
      prisma.document.count({ where: { status: 'APPROVED' } }),
      prisma.document.count({ where: { status: 'PUBLISHED' } }),
      prisma.document.count({ where: { status: 'REJECTED' } }),
    ])
    console.log(`  IN_REVIEW          : ${detailedCounts[0]}`)
    console.log(`  PENDING_APPROVAL   : ${detailedCounts[1]}`)
    console.log(`  APPROVED           : ${detailedCounts[2]}`)
    console.log(`  PUBLISHED          : ${detailedCounts[3]}`)
    console.log(`  REJECTED           : ${detailedCounts[4]} (tidak muncul di chart)`)
    
    // Check for discrepancies
    const chartTotal = draft + pending + approved + archived
    console.log('\n🎯 Validasi:')
    console.log('─────────────────────────────')
    if (chartTotal === totalReal) {
      console.log('✅ DATA SESUAI: Total data chart sama dengan total di database')
    } else {
      console.log(`⚠️  KETIDAKSESUAIAN: Total chart (${chartTotal}) != Total real (${totalReal})`)
      console.log(`   Selisih: ${Math.abs(chartTotal - totalReal)} dokumen`)
    }
    
    // Check if any status is missing
    const apiStatuses = new Set(['DRAFT', 'IN_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'ARCHIVED'])
    const dbStatuses = new Set(statusCounts.map(s => s.status))
    const missingStatuses = [...dbStatuses].filter(s => !apiStatuses.has(s))
    
    if (missingStatuses.length > 0) {
      console.log(`\n⚠️  Status yang ada di DB tapi tidak tercakup di chart: ${missingStatuses.join(', ')}`)
      for (const status of missingStatuses) {
        const count = statusCounts.find(s => s.status === status)?._count.id || 0
        console.log(`   ${status}: ${count} dokumen`)
      }
    }
    
    // Check what pie chart filters
    console.log('\n📊 Filter Chart (hanya non-ARCHIVED):')
    console.log('─────────────────────────────')
    const nonArchived = draft + pending + approved
    console.log(`Total dokumen di chart: ${nonArchived}`)
    console.log(`Archived (tidak muncul): ${archived}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDocumentStatus()
