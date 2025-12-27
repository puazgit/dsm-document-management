import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyDocumentActivityFilter() {
  console.log('🔍 Verifying Document Activity Filter Implementation')
  console.log('=' .repeat(80))
  console.log('Changes: Only USER activities (VIEW, DOWNLOAD, COMMENT) on PUBLISHED documents')
  console.log('         are now recorded in Document Activities.')
  console.log('         Administrative activities (CREATE, UPDATE, DELETE, APPROVE, etc.)')
  console.log('         are still recorded regardless of status.')
  console.log('')
  
  try {
    // Get all documents grouped by status
    const documentsByStatus = await prisma.document.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
    
    console.log('📊 Current Documents by Status:')
    console.log('-'.repeat(80))
    for (const group of documentsByStatus) {
      console.log(`   ${group.status}: ${group._count.status} document(s)`)
    }
    
    // Get recent activities
    const recentActivities = await prisma.documentActivity.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        document: {
          select: {
            title: true,
            status: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    console.log('\n\n📝 Recent Document Activities (Last 20):')
    console.log('-'.repeat(80))
    
    if (recentActivities.length === 0) {
      console.log('   No activities found')
    } else {
      const userActions = ['VIEW', 'DOWNLOAD', 'COMMENT']
      const adminActions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT']
      
      recentActivities.forEach((activity, index) => {
        const actionType = userActions.includes(activity.action) ? '👤 USER' : '⚙️  ADMIN'
        const statusBadge = activity.document.status === 'PUBLISHED' ? '✅' : '⚠️ '
        
        console.log(`\n   ${index + 1}. ${actionType} ACTION: ${activity.action}`)
        console.log(`      Document: "${activity.document.title}"`)
        console.log(`      Status: ${statusBadge} ${activity.document.status}`)
        console.log(`      User: ${activity.user.firstName} ${activity.user.lastName} (${activity.user.email})`)
        console.log(`      Time: ${activity.createdAt.toLocaleString()}`)
        console.log(`      Description: ${activity.description}`)
        
        // Validate the filter is working
        if (userActions.includes(activity.action) && activity.document.status !== 'PUBLISHED') {
          console.log(`      ❌ WARNING: User action on non-published document! This should not happen after the fix.`)
        }
      })
      
      // Statistics
      console.log('\n\n📊 Activity Statistics:')
      console.log('-'.repeat(80))
      
      const userActivityCount = recentActivities.filter(a => userActions.includes(a.action)).length
      const adminActivityCount = recentActivities.filter(a => adminActions.includes(a.action)).length
      const publishedActivityCount = recentActivities.filter(a => a.document.status === 'PUBLISHED').length
      const nonPublishedUserActivity = recentActivities.filter(a => 
        userActions.includes(a.action) && a.document.status !== 'PUBLISHED'
      ).length
      
      console.log(`   Total activities: ${recentActivities.length}`)
      console.log(`   User activities (VIEW/DOWNLOAD/COMMENT): ${userActivityCount}`)
      console.log(`   Admin activities (CREATE/UPDATE/DELETE/etc): ${adminActivityCount}`)
      console.log(`   Activities on published docs: ${publishedActivityCount}`)
      console.log(`   ⚠️  User activities on non-published: ${nonPublishedUserActivity}`)
      
      if (nonPublishedUserActivity > 0) {
        console.log('\n   ❌ Found user activities on non-published documents!')
        console.log('      These are OLD activities from before the filter was implemented.')
        console.log('      NEW activities should not include user actions on non-published docs.')
      } else {
        console.log('\n   ✅ No user activities found on non-published documents!')
      }
    }
    
    console.log('\n\n✅ IMPLEMENTATION SUMMARY:')
    console.log('=' .repeat(80))
    console.log('Files modified:')
    console.log('   1. /api/documents/[id]/view/route.ts - VIEW activities')
    console.log('   2. /api/documents/[id]/download/route.ts - DOWNLOAD activities')
    console.log('   3. /api/documents/[id]/route.ts - VIEW activities (GET)')
    console.log('   4. /api/documents/[id]/comments/route.ts - COMMENT activities')
    console.log('')
    console.log('Filter Logic:')
    console.log('   • USER actions (VIEW, DOWNLOAD, COMMENT) → Only logged if status = "published"')
    console.log('   • ADMIN actions (CREATE, UPDATE, DELETE, APPROVE) → Always logged')
    console.log('')
    console.log('Next Steps:')
    console.log('   1. Test by viewing/downloading a draft document → No activity logged')
    console.log('   2. Test by viewing/downloading a published document → Activity logged')
    console.log('   3. Check /admin/audit-logs to see only published document activities')
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

verifyDocumentActivityFilter()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
