// Check sync between workflows and RBAC
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Synchronization: /admin/workflows vs /admin/rbac/assignments\n');

  // Get capabilities
  const capabilities = await prisma.capability.findMany({
    where: { 
      OR: [
        { name: { contains: 'DOCUMENT' } },
        { name: 'ADMIN_ACCESS' }
      ]
    },
    orderBy: { name: 'asc' }
  });
  
  // Get workflow transitions with their permissions
  const transitions = await prisma.workflowTransition.findMany({
    select: { 
      requiredPermission: true,
      fromStatus: true,
      toStatus: true
    },
    where: { isActive: true }
  });
  
  console.log('=== CAPABILITIES (RBAC System @ /admin/rbac/assignments) ===');
  capabilities.forEach(c => {
    console.log(`  ✓ ${c.name}`);
  });
  
  console.log('\n=== PERMISSIONS (Workflow System @ /admin/workflows) ===');
  const permissions = [...new Set(transitions.map(t => t.requiredPermission).filter(Boolean))];
  permissions.forEach(p => {
    console.log(`  ✓ ${p}`);
  });
  
  console.log('\n=== MAPPING (in /api/documents/[id]/status/route.ts) ===');
  const mapping = [
    { capability: 'DOCUMENT_VIEW', permission: 'documents.read' },
    { capability: 'DOCUMENT_CREATE', permission: 'documents.create' },
    { capability: 'DOCUMENT_EDIT', permission: 'documents.update' },
    { capability: 'DOCUMENT_DELETE', permission: 'documents.delete' },
    { capability: 'DOCUMENT_APPROVE', permission: 'documents.approve' },
    { capability: 'DOCUMENT_PUBLISH', permission: 'documents.publish' },
  ];
  
  mapping.forEach(m => {
    const capExists = capabilities.some(c => c.name === m.capability);
    const permExists = permissions.includes(m.permission);
    const status = capExists && permExists ? '✅' : '⚠️';
    console.log(`  ${status} ${m.capability} -> ${m.permission} (Cap: ${capExists ? '✓' : '✗'}, Perm: ${permExists ? '✓' : '✗'})`);
  });

  console.log('\n=== SYNCHRONIZATION STATUS ===');
  
  // Check for unmapped permissions
  const unmappedPerms = permissions.filter(p => 
    !mapping.some(m => m.permission === p)
  );
  
  if (unmappedPerms.length > 0) {
    console.log('⚠️  Unmapped Permissions (used in workflows but no capability mapping):');
    unmappedPerms.forEach(p => console.log(`     - ${p}`));
  } else {
    console.log('✅ All workflow permissions have capability mappings');
  }
  
  // Check for unused capabilities
  const documentCaps = capabilities.filter(c => c.name.startsWith('DOCUMENT_'));
  const mappedCaps = mapping.map(m => m.capability);
  const unusedCaps = documentCaps.filter(c => !mappedCaps.includes(c.name));
  
  if (unusedCaps.length > 0) {
    console.log('\n⚠️  Capabilities without workflow permission mapping:');
    unusedCaps.forEach(c => console.log(`     - ${c.name} (${c.description})`));
  }

  console.log('\n=== ISSUES DETECTED ===');
  
  const issues = [];
  
  // Issue 1: Two separate systems
  issues.push('1. ❌ Dual System: RBAC uses CAPABILITIES, Workflows use old PERMISSIONS');
  issues.push('   - RBAC (/admin/rbac/assignments): Manages CAPABILITIES (DOCUMENT_EDIT, DOCUMENT_APPROVE, etc)');
  issues.push('   - Workflows (/admin/workflows): Uses old PERMISSIONS (documents.update, documents.approve, etc)');
  issues.push('   - Requires manual mapping in API layer (not visible in either UI)');
  
  // Issue 2: No direct sync
  issues.push('\n2. ❌ No Direct Synchronization:');
  issues.push('   - Changing capabilities in /admin/rbac/assignments does NOT auto-update workflows');
  issues.push('   - Changing workflow permissions in /admin/workflows does NOT validate against capabilities');
  issues.push('   - Admin must manually ensure both systems stay aligned');
  
  // Issue 3: Hidden mapping
  issues.push('\n3. ⚠️  Hidden Mapping Logic:');
  issues.push('   - Capability->Permission mapping hardcoded in /api/documents/[id]/status/route.ts');
  issues.push('   - Not visible in either admin UI');
  issues.push('   - Admin cannot see or modify this mapping');
  
  issues.forEach(issue => console.log(issue));
  
  console.log('\n=== RECOMMENDATIONS ===');
  console.log('Option 1: Migrate workflows to use capabilities directly');
  console.log('  - Update WorkflowTransition.requiredPermission to use capability names');
  console.log('  - Remove mapping layer in API');
  console.log('  - Single source of truth\n');
  
  console.log('Option 2: Create explicit mapping table');
  console.log('  - Add CapabilityPermissionMapping table');
  console.log('  - Make mapping visible/editable in admin UI');
  console.log('  - Keep flexibility of separate systems\n');
  
  console.log('Option 3: Keep current hybrid (NOT RECOMMENDED)');
  console.log('  - Document mapping clearly');
  console.log('  - Add validation to prevent drift');
  console.log('  - Accept maintenance overhead');
  
  await prisma.$disconnect();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
