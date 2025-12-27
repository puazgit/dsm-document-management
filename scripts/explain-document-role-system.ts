import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function explainDocumentRoleSystem() {
  console.log('📚 DOCUMENT ROLE & ACCESS SYSTEM EXPLANATION')
  console.log('=' .repeat(80))
  
  try {
    // 1. Show all roles and their document capabilities
    console.log('\n🎭 ROLES AND THEIR DOCUMENT CAPABILITIES:')
    console.log('-'.repeat(80))
    
    const roles = await prisma.role.findMany({
      where: { isActive: true },
      include: {
        capabilityAssignments: {
          include: {
            capability: true
          }
        },
        _count: {
          select: {
            userRoles: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    for (const role of roles) {
      const docCapabilities = role.capabilityAssignments
        .map(ca => ca.capability.name)
        .filter(name => name.startsWith('DOCUMENT_'))
      
      console.log(`\n   📋 ${role.name} (${role.displayName})`)
      console.log(`      Users: ${role._count.userRoles}`)
      console.log(`      Document Capabilities:`)
      
      if (docCapabilities.length === 0) {
        console.log(`         ❌ None - Cannot access documents`)
      } else {
        docCapabilities.forEach(cap => {
          console.log(`         ✓ ${cap}`)
        })
      }
    }
    
    // 2. Show document access patterns
    console.log('\n\n\n📄 DOCUMENT ACCESS CONTROL PATTERNS:')
    console.log('=' .repeat(80))
    
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        isPublic: true,
        accessGroups: true,
        createdBy: {
          select: {
            email: true,
            group: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { status: 'asc' }
    })
    
    // Group by access pattern
    const publicDocs = documents.filter(d => d.isPublic)
    const restrictedDocs = documents.filter(d => !d.isPublic && d.accessGroups.length > 0)
    const ownerOnlyDocs = documents.filter(d => !d.isPublic && d.accessGroups.length === 0)
    
    console.log('\n1️⃣  PUBLIC DOCUMENTS (Accessible by all authenticated users)')
    console.log('-'.repeat(80))
    console.log(`   Total: ${publicDocs.length} documents`)
    publicDocs.slice(0, 5).forEach(doc => {
      console.log(`   • "${doc.title}" [${doc.status}]`)
    })
    if (publicDocs.length > 5) {
      console.log(`   ... and ${publicDocs.length - 5} more`)
    }
    
    console.log('\n\n2️⃣  RESTRICTED DOCUMENTS (Group/Role-based access)')
    console.log('-'.repeat(80))
    console.log(`   Total: ${restrictedDocs.length} documents`)
    restrictedDocs.slice(0, 5).forEach(doc => {
      console.log(`   • "${doc.title}" [${doc.status}]`)
      console.log(`     Access: [${doc.accessGroups.join(', ')}]`)
    })
    if (restrictedDocs.length > 5) {
      console.log(`   ... and ${restrictedDocs.length - 5} more`)
    }
    
    console.log('\n\n3️⃣  OWNER-ONLY DOCUMENTS (No public or group access)')
    console.log('-'.repeat(80))
    console.log(`   Total: ${ownerOnlyDocs.length} documents`)
    ownerOnlyDocs.slice(0, 5).forEach(doc => {
      console.log(`   • "${doc.title}" [${doc.status}]`)
      console.log(`     Owner: ${doc.createdBy.email} (${doc.createdBy.group?.name || 'no group'})`)
    })
    if (ownerOnlyDocs.length > 5) {
      console.log(`   ... and ${ownerOnlyDocs.length - 5} more`)
    }
    
    // 3. Recommendations
    console.log('\n\n\n💡 RECOMMENDATIONS FOR DOCUMENT ACCESS:')
    console.log('=' .repeat(80))
    
    console.log('\n✅ BEST PRACTICES:')
    console.log('-'.repeat(80))
    console.log('   1. Published Documents → Set isPublic = true')
    console.log('      • All authenticated users can access')
    console.log('      • Simplest approach for organization-wide docs')
    console.log('')
    console.log('   2. Draft/Review Documents → Use accessGroups')
    console.log('      • Add specific groups/roles that need access')
    console.log('      • Example: ["tik", "manager", "ppd.central"]')
    console.log('')
    console.log('   3. Confidential Documents → Restricted access')
    console.log('      • Keep isPublic = false')
    console.log('      • Add only management roles')
    console.log('      • Example: ["director", "management", "admin"]')
    console.log('')
    console.log('   4. Personal/Draft Documents → Owner only')
    console.log('      • isPublic = false')
    console.log('      • accessGroups = []')
    console.log('      • Only creator and admins can access')
    
    console.log('\n\n⚙️  HOW TO CONFIGURE:')
    console.log('-'.repeat(80))
    console.log('   A. Via UI (when creating/editing document):')
    console.log('      • Set "Public Document" toggle')
    console.log('      • Or select groups/roles in "Access Groups" field')
    console.log('')
    console.log('   B. Via API:')
    console.log('      • POST/PUT /api/documents')
    console.log('      • Body: { isPublic: true } or { accessGroups: ["group1"] }')
    console.log('')
    console.log('   C. Via Script (bulk update):')
    console.log('      • Run: npx ts-node scripts/set-published-docs-public.ts')
    
    // 4. Check for issues
    console.log('\n\n\n⚠️  POTENTIAL ISSUES:')
    console.log('=' .repeat(80))
    
    const publishedNotPublic = documents.filter(d => 
      d.status === 'PUBLISHED' && !d.isPublic && d.accessGroups.length === 0
    )
    
    if (publishedNotPublic.length > 0) {
      console.log(`\n   ❌ Found ${publishedNotPublic.length} PUBLISHED document(s) with NO ACCESS:`)
      publishedNotPublic.forEach(doc => {
        console.log(`      • "${doc.title}"`)
        console.log(`        Owner only: ${doc.createdBy.email}`)
        console.log(`        Fix: Set isPublic=true or add accessGroups`)
      })
    } else {
      console.log('\n   ✅ No published documents without access')
    }
    
    // Check users without document capabilities
    console.log('\n\n   👥 Users without DOCUMENT_VIEW/READ capability:')
    const usersWithoutDocAccess = await prisma.user.findMany({
      where: {
        isActive: true,
        userRoles: {
          none: {
            role: {
              capabilityAssignments: {
                some: {
                  capability: {
                    name: {
                      in: ['DOCUMENT_VIEW', 'DOCUMENT_READ', 'DOCUMENT_FULL_ACCESS']
                    }
                  }
                }
              }
            }
          }
        }
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (usersWithoutDocAccess.length > 0) {
      console.log(`      ❌ Found ${usersWithoutDocAccess.length} user(s) without document access:`)
      usersWithoutDocAccess.forEach(user => {
        console.log(`         • ${user.email} (${user.firstName} ${user.lastName})`)
        const roles = user.userRoles.map(ur => ur.role.name).join(', ') || 'no roles'
        console.log(`           Roles: ${roles}`)
      })
    } else {
      console.log('      ✅ All active users have document access capabilities')
    }
    
    console.log('\n\n✅ SUMMARY:')
    console.log('=' .repeat(80))
    console.log(`   Total Documents: ${documents.length}`)
    console.log(`   Public: ${publicDocs.length}`)
    console.log(`   Restricted: ${restrictedDocs.length}`)
    console.log(`   Owner-only: ${ownerOnlyDocs.length}`)
    console.log(`   Active Roles: ${roles.length}`)
    console.log(`   Users without doc access: ${usersWithoutDocAccess.length}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

explainDocumentRoleSystem()
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
