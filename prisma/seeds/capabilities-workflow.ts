/**
 * Seed Role Capabilities and Workflow Transitions
 * Run with: npx ts-node prisma/seeds/capabilities-workflow.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCapabilities() {
  console.log('🔧 Seeding Role Capabilities...');

  // Define capabilities
  const capabilities = [
    {
      name: 'ADMIN_ACCESS',
      description: 'Full administrative access to all system features',
      category: 'system'
    },
    {
      name: 'DOCUMENT_FULL_ACCESS',
      description: 'Full access to all documents regardless of ownership or status',
      category: 'document'
    },
    {
      name: 'DOCUMENT_MANAGE',
      description: 'Manage document lifecycle, workflows, and approvals',
      category: 'document'
    },
    {
      name: 'USER_MANAGE',
      description: 'Manage users, assignments, and user-related operations',
      category: 'user'
    },
    {
      name: 'ROLE_MANAGE',
      description: 'Manage roles, permissions, and role assignments',
      category: 'user'
    },
    {
      name: 'SYSTEM_CONFIGURE',
      description: 'Configure system settings, workflows, and configurations',
      category: 'system'
    }
  ];

  // Create or update capabilities
  for (const cap of capabilities) {
    await prisma.roleCapability.upsert({
      where: { name: cap.name },
      update: cap,
      create: cap
    });
    console.log(`  ✓ ${cap.name}`);
  }

  // Get roles
  const roles = await prisma.role.findMany();
  const adminRole = roles.find(r => r.name === 'admin');
  const managerRole = roles.find(r => r.name === 'manager');
  const editorRole = roles.find(r => r.name === 'editor');
  
  if (!adminRole || !managerRole || !editorRole) {
    console.error('❌ Required roles not found in database');
    return;
  }

  // Get capabilities
  const adminAccess = await prisma.roleCapability.findUnique({ where: { name: 'ADMIN_ACCESS' } });
  const documentFullAccess = await prisma.roleCapability.findUnique({ where: { name: 'DOCUMENT_FULL_ACCESS' } });
  const documentManage = await prisma.roleCapability.findUnique({ where: { name: 'DOCUMENT_MANAGE' } });
  const userManage = await prisma.roleCapability.findUnique({ where: { name: 'USER_MANAGE' } });
  const roleManage = await prisma.roleCapability.findUnique({ where: { name: 'ROLE_MANAGE' } });
  const systemConfigure = await prisma.roleCapability.findUnique({ where: { name: 'SYSTEM_CONFIGURE' } });

  if (!adminAccess || !documentFullAccess || !documentManage || !userManage || !roleManage || !systemConfigure) {
    console.error('❌ Capabilities not found');
    return;
  }

  console.log('\n🔗 Assigning Capabilities to Roles...');

  // Admin: All capabilities
  const adminCapabilities = [adminAccess, documentFullAccess, documentManage, userManage, roleManage, systemConfigure];
  for (const cap of adminCapabilities) {
    await prisma.roleCapabilityAssignment.upsert({
      where: {
        roleId_capabilityId: {
          roleId: adminRole.id,
          capabilityId: cap.id
        }
      },
      update: {},
      create: {
        roleId: adminRole.id,
        capabilityId: cap.id
      }
    });
  }
  console.log(`  ✓ admin → ${adminCapabilities.length} capabilities`);

  // Manager: Document management and user management
  const managerCapabilities = [documentManage, userManage];
  for (const cap of managerCapabilities) {
    await prisma.roleCapabilityAssignment.upsert({
      where: {
        roleId_capabilityId: {
          roleId: managerRole.id,
          capabilityId: cap.id
        }
      },
      update: {},
      create: {
        roleId: managerRole.id,
        capabilityId: cap.id
      }
    });
  }
  console.log(`  ✓ manager → ${managerCapabilities.length} capabilities`);

  // Editor: Only document management
  await prisma.roleCapabilityAssignment.upsert({
    where: {
      roleId_capabilityId: {
        roleId: editorRole.id,
        capabilityId: documentManage.id
      }
    },
    update: {},
    create: {
      roleId: editorRole.id,
      capabilityId: documentManage.id
    }
  });
  console.log(`  ✓ editor → 1 capability`);

  // Check if legal user has editor role with full document permissions
  // If so, grant DOCUMENT_FULL_ACCESS capability
  const legalUser = await prisma.user.findUnique({
    where: { email: 'legal@dsm.com' },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (legalUser) {
    const permissions = legalUser.userRoles.flatMap(ur => 
      ur.role.rolePermissions.map(rp => rp.permission.name)
    );
    
    const hasFullDocPerms = 
      permissions.includes('documents.read') &&
      permissions.includes('documents.create') &&
      permissions.includes('documents.update') &&
      permissions.includes('documents.approve') &&
      permissions.includes('documents.delete');

    if (hasFullDocPerms) {
      const legalRole = legalUser.userRoles[0]?.role;
      if (legalRole) {
        await prisma.roleCapabilityAssignment.upsert({
          where: {
            roleId_capabilityId: {
              roleId: legalRole.id,
              capabilityId: documentFullAccess.id
            }
          },
          update: {},
          create: {
            roleId: legalRole.id,
            capabilityId: documentFullAccess.id
          }
        });
        console.log(`  ✓ ${legalRole.name} → DOCUMENT_FULL_ACCESS (legal user)`);
      }
    }
  }

  console.log('✅ Role Capabilities seeded successfully\n');
}

async function seedWorkflowTransitions() {
  console.log('🔄 Seeding Workflow Transitions...');

  const transitions = [
    // Submit for review
    {
      fromStatus: 'DRAFT',
      toStatus: 'PENDING_REVIEW',
      minLevel: 50,
      requiredPermission: 'documents.update',
      description: 'Submit document for review',
      allowedByLabel: 'Editor, Manager, Administrator',
      sortOrder: 1
    },
    // Forward for approval
    {
      fromStatus: 'PENDING_REVIEW',
      toStatus: 'PENDING_APPROVAL',
      minLevel: 70,
      requiredPermission: 'documents.update',
      description: 'Review completed, forward for approval',
      allowedByLabel: 'Manager, Administrator',
      sortOrder: 2
    },
    // Approve document
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'APPROVED',
      minLevel: 70,
      requiredPermission: 'documents.approve',
      description: 'Approve document',
      allowedByLabel: 'Manager, Administrator',
      sortOrder: 3
    },
    // Publish document
    {
      fromStatus: 'APPROVED',
      toStatus: 'PUBLISHED',
      minLevel: 100,
      requiredPermission: 'documents.approve',
      description: 'Publish approved document',
      allowedByLabel: 'Administrator',
      sortOrder: 4
    },
    // Send back to draft from review
    {
      fromStatus: 'PENDING_REVIEW',
      toStatus: 'DRAFT',
      minLevel: 50,
      requiredPermission: 'documents.update',
      description: 'Send back to draft for revision',
      allowedByLabel: 'Editor, Manager, Administrator',
      sortOrder: 5
    },
    // Request revision from approval
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'PENDING_REVIEW',
      minLevel: 70,
      requiredPermission: 'documents.update',
      description: 'Request revision before approval',
      allowedByLabel: 'Manager, Administrator',
      sortOrder: 6
    },
    // Reject document
    {
      fromStatus: 'PENDING_APPROVAL',
      toStatus: 'REJECTED',
      minLevel: 70,
      requiredPermission: 'documents.approve',
      description: 'Reject document',
      allowedByLabel: 'Manager, Administrator',
      sortOrder: 7
    },
    // Archive published document
    {
      fromStatus: 'PUBLISHED',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive published document',
      allowedByLabel: 'Administrator',
      sortOrder: 8
    },
    // Archive approved document
    {
      fromStatus: 'APPROVED',
      toStatus: 'ARCHIVED',
      minLevel: 100,
      requiredPermission: 'documents.delete',
      description: 'Archive approved document',
      allowedByLabel: 'Administrator',
      sortOrder: 9
    }
  ];

  for (const transition of transitions) {
    await prisma.workflowTransition.upsert({
      where: {
        fromStatus_toStatus: {
          fromStatus: transition.fromStatus,
          toStatus: transition.toStatus
        }
      },
      update: transition,
      create: transition
    });
    console.log(`  ✓ ${transition.fromStatus} → ${transition.toStatus}`);
  }

  console.log('✅ Workflow Transitions seeded successfully\n');
}

async function main() {
  try {
    await seedCapabilities();
    await seedWorkflowTransitions();
    
    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
