import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedWorkflowTransitions() {
  console.log('🌱 Seeding workflow transitions...');

  const transitions = [
    // 1. DRAFT -> PENDING_REVIEW
    {
      fromStatus: 'DRAFT',
      toStatus: 'PENDING_REVIEW',
      minLevel: 50,
      requiredPermission: 'documents.update',
      description: 'Submit document for review',
      allowedByLabel: 'Editor, Manager, Administrator',
      isActive: true,
      sortOrder: 1
    },
    // 2. PENDING_REVIEW -> PENDING_APPROVAL
    {
      fromStatus: 'PENDING_REVIEW',
      toStatus: 'PENDING_APPROVAL',
      minLevel: 70,
      requiredPermission: 'documents.update',
      description: 'Review completed, forward for approval',
      allowedByLabel: 'Manager, Administrator',
      isActive: true,
      sortOrder: 2
    },
    // 3. PENDING_REVIEW -> DRAFT
    {
      fromStatus: 'PENDING_REVIEW',
      toStatus: 'DRAFT',
      minLevel: 70,
      requiredPermission: 'documents.update',
      description: 'Send back for revision',
      allowedByLabel: 'Manager, Administrator',
      isActive: true,
      sortOrder: 3
    },
    // 4. PENDING_APPROVAL -> APPROVED
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'APPROVED',
      minLevel: 70,
      requiredPermission: 'documents.approve',
      description: 'Approve document',
      allowedByLabel: 'Manager, Administrator',
      isActive: true,
      sortOrder: 4
    },
    // 5. PENDING_APPROVAL -> REJECTED
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'REJECTED',
      minLevel: 70,
      requiredPermission: 'documents.approve',
      description: 'Reject document',
      allowedByLabel: 'Manager, Administrator',
      isActive: true,
      sortOrder: 5
    },
    // 6. APPROVED -> PUBLISHED
    {
      fromStatus: 'APPROVED',
      toStatus: 'PUBLISHED',
      minLevel: 100,
      requiredPermission: 'documents.publish',
      description: 'Publish approved document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 6
    },
    // 7. REJECTED -> DRAFT
    {
      fromStatus: 'REJECTED',
      toStatus: 'DRAFT',
      minLevel: 50,
      requiredPermission: 'documents.update',
      description: 'Return to draft for revision after rejection',
      allowedByLabel: 'Editor, Manager, Administrator',
      isActive: true,
      sortOrder: 7
    },
    // 8. DRAFT -> ARCHIVED
    {
      fromStatus: 'DRAFT',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 8
    },
    // 9. PENDING_REVIEW -> ARCHIVED
    {
      fromStatus: 'PENDING_REVIEW',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 9
    },
    // 10. PENDING_APPROVAL -> ARCHIVED
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 10
    },
    // 11. APPROVED -> ARCHIVED
    {
      fromStatus: 'APPROVED',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 11
    },
    // 12. PUBLISHED -> ARCHIVED
    {
      fromStatus: 'PUBLISHED',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 12
    },
    // 13. REJECTED -> ARCHIVED
    {
      fromStatus: 'REJECTED',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 13
    },
    // 14. PUBLISHED -> EXPIRED
    {
      fromStatus: 'PUBLISHED',
      toStatus: 'EXPIRED',
      minLevel: 100,
      requiredPermission: 'documents.update',
      description: 'Mark published document as expired',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 14
    },
    // 15. ARCHIVED -> DRAFT
    {
      fromStatus: 'ARCHIVED',
      toStatus: 'DRAFT',
      minLevel: 100,
      requiredPermission: 'documents.update',
      description: 'Unarchive document',
      allowedByLabel: 'Administrator',
      isActive: true,
      sortOrder: 15
    },
  ];

  for (const transition of transitions) {
    await prisma.workflowTransition.upsert({
      where: {
        fromStatus_toStatus: {
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus
        }
      },
      create: transition,
      update: transition
    });
  }

  console.log(`✅ Seeded ${transitions.length} workflow transitions`);
}

seedWorkflowTransitions()
  .catch((e) => {
    console.error('❌ Error seeding workflow transitions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
