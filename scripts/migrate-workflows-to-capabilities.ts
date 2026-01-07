import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Migration script to update workflow transitions from old permissions to capabilities
 */

const PERMISSION_TO_CAPABILITY_MAP: Record<string, string> = {
  'documents.read': 'DOCUMENT_VIEW',
  'documents.create': 'DOCUMENT_CREATE',
  'documents.update': 'DOCUMENT_EDIT',
  'documents.delete': 'DOCUMENT_DELETE',
  'documents.approve': 'DOCUMENT_APPROVE',
  'documents.publish': 'DOCUMENT_PUBLISH',
}

async function main() {
  console.log('🔄 Migrating workflow transitions from permissions to capabilities\n')

  // Get all workflow transitions
  const transitions = await prisma.workflowTransition.findMany()

  console.log(`Found ${transitions.length} workflow transitions\n`)

  let updated = 0
  let skipped = 0

  for (const transition of transitions) {
    const oldPermission = transition.requiredPermission
    
    if (!oldPermission) {
      console.log(`⚠️  Skipping ${transition.fromStatus} -> ${transition.toStatus}: No permission set`)
      skipped++
      continue
    }

    // Check if already using capability format
    if (oldPermission.startsWith('DOCUMENT_')) {
      console.log(`✓  Already using capability: ${transition.fromStatus} -> ${transition.toStatus} (${oldPermission})`)
      skipped++
      continue
    }

    const newCapability = PERMISSION_TO_CAPABILITY_MAP[oldPermission]

    if (!newCapability) {
      console.log(`❌ Unknown permission mapping: ${oldPermission} for ${transition.fromStatus} -> ${transition.toStatus}`)
      skipped++
      continue
    }

    // Update the transition
    await prisma.workflowTransition.update({
      where: { id: transition.id },
      data: { requiredPermission: newCapability }
    })

    console.log(`✅ Updated: ${transition.fromStatus} -> ${transition.toStatus}`)
    console.log(`   ${oldPermission} → ${newCapability}`)
    updated++
  }

  console.log(`\n✨ Migration complete!`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total: ${transitions.length}`)

  await prisma.$disconnect()
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
