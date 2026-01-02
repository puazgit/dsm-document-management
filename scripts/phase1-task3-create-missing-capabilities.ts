import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Permission → Capability mapping with categories
const PERMISSION_CAPABILITY_MAP: Array<{
  permission: string;
  capability: string;
  category: string;
  description: string;
}> = [
  // AUDIT (4)
  { permission: 'audit.analytics', capability: 'AUDIT_ANALYTICS', category: 'audit', description: 'View audit analytics and reports' },
  { permission: 'audit.export', capability: 'AUDIT_EXPORT', category: 'audit', description: 'Export audit reports to files' },
  { permission: 'audit.read', capability: 'AUDIT_READ', category: 'audit', description: 'View audit logs' },
  { permission: 'audit.view', capability: 'AUDIT_VIEW', category: 'audit', description: 'View audit logs (alias)' },
  
  // COMMENTS (5)
  { permission: 'comments.create', capability: 'COMMENT_CREATE', category: 'document', description: 'Create comments on documents' },
  { permission: 'comments.delete', capability: 'COMMENT_DELETE', category: 'document', description: 'Delete comments' },
  { permission: 'comments.moderate', capability: 'COMMENT_MODERATE', category: 'document', description: 'Moderate comments' },
  { permission: 'comments.read', capability: 'COMMENT_READ', category: 'document', description: 'View comments' },
  { permission: 'comments.update', capability: 'COMMENT_UPDATE', category: 'document', description: 'Edit comments' },
  
  // DOCUMENT TYPES (4)
  { permission: 'document-types.create', capability: 'DOCUMENT_TYPE_CREATE', category: 'document', description: 'Create document types' },
  { permission: 'document-types.delete', capability: 'DOCUMENT_TYPE_DELETE', category: 'document', description: 'Delete document types' },
  { permission: 'document-types.read', capability: 'DOCUMENT_TYPE_READ', category: 'document', description: 'View document types' },
  { permission: 'document-types.update', capability: 'DOCUMENT_TYPE_UPDATE', category: 'document', description: 'Update document types' },
  
  // DOCUMENTS (11)
  { permission: 'documents.approve', capability: 'DOCUMENT_APPROVE', category: 'document', description: 'Approve documents' },
  { permission: 'documents.create', capability: 'DOCUMENT_CREATE', category: 'document', description: 'Create new documents' },
  { permission: 'documents.delete', capability: 'DOCUMENT_DELETE', category: 'document', description: 'Delete documents' },
  { permission: 'documents.delete.own', capability: 'DOCUMENT_DELETE_OWN', category: 'document', description: 'Delete own documents only' },
  { permission: 'documents.download', capability: 'DOCUMENT_DOWNLOAD', category: 'document', description: 'Download documents' },
  { permission: 'documents.read', capability: 'DOCUMENT_READ', category: 'document', description: 'View documents' },
  { permission: 'documents.read.own', capability: 'DOCUMENT_READ_OWN', category: 'document', description: 'View own documents only' },
  { permission: 'documents.update', capability: 'DOCUMENT_UPDATE', category: 'document', description: 'Update documents' },
  { permission: 'documents.update.own', capability: 'DOCUMENT_UPDATE_OWN', category: 'document', description: 'Update own documents only' },
  { permission: 'documents.upload', capability: 'DOCUMENT_UPLOAD', category: 'document', description: 'Upload document files' },
  { permission: 'documents.view', capability: 'DOCUMENT_VIEW', category: 'document', description: 'View documents (alias)' },
  
  // GROUPS (4)
  { permission: 'groups.create', capability: 'GROUP_CREATE', category: 'user', description: 'Create user groups' },
  { permission: 'groups.delete', capability: 'GROUP_DELETE', category: 'user', description: 'Delete user groups' },
  { permission: 'groups.update', capability: 'GROUP_UPDATE', category: 'user', description: 'Update user groups' },
  { permission: 'groups.view', capability: 'GROUP_VIEW', category: 'user', description: 'View user groups' },
  
  // PDF (5) - Already exist in database
  { permission: 'pdf.copy', capability: 'PDF_COPY', category: 'document', description: 'Copy PDF content' },
  { permission: 'pdf.download', capability: 'PDF_DOWNLOAD', category: 'document', description: 'Download PDF files' },
  { permission: 'pdf.print', capability: 'PDF_PRINT', category: 'document', description: 'Print PDF documents' },
  { permission: 'pdf.view', capability: 'PDF_VIEW', category: 'document', description: 'View PDF documents' },
  { permission: 'pdf.watermark', capability: 'PDF_WATERMARK', category: 'document', description: 'View PDF without watermark' },
  
  // PERMISSIONS (2)
  { permission: 'permissions.manage', capability: 'PERMISSION_MANAGE', category: 'system', description: 'Manage system permissions' },
  { permission: 'permissions.view', capability: 'PERMISSION_VIEW', category: 'system', description: 'View permissions' },
  
  // ROLES (6)
  { permission: 'roles.assign', capability: 'ROLE_ASSIGN', category: 'user', description: 'Assign roles to users' },
  { permission: 'roles.create', capability: 'ROLE_CREATE', category: 'user', description: 'Create new roles' },
  { permission: 'roles.delete', capability: 'ROLE_DELETE', category: 'user', description: 'Delete roles' },
  { permission: 'roles.read', capability: 'ROLE_READ', category: 'user', description: 'View roles' },
  { permission: 'roles.update', capability: 'ROLE_UPDATE', category: 'user', description: 'Update roles' },
  { permission: 'roles.view', capability: 'ROLE_VIEW', category: 'user', description: 'View roles (alias)' },
  
  // SETTINGS (2)
  { permission: 'settings.update', capability: 'SETTINGS_UPDATE', category: 'system', description: 'Update system settings' },
  { permission: 'settings.view', capability: 'SETTINGS_VIEW', category: 'system', description: 'View system settings' },
  
  // SYSTEM (4)
  { permission: 'system.admin', capability: 'SYSTEM_ADMIN', category: 'system', description: 'System administration access' },
  { permission: 'system.analytics', capability: 'SYSTEM_ANALYTICS', category: 'system', description: 'View system analytics' },
  { permission: 'system.logs', capability: 'SYSTEM_LOGS', category: 'system', description: 'View system logs' },
  { permission: 'system.settings', capability: 'SYSTEM_SETTINGS', category: 'system', description: 'Manage system settings' },
  
  // USERS (6)
  { permission: 'users.create', capability: 'USER_CREATE', category: 'user', description: 'Create new users' },
  { permission: 'users.delete', capability: 'USER_DELETE', category: 'user', description: 'Delete users' },
  { permission: 'users.profile', capability: 'USER_PROFILE', category: 'user', description: 'Manage own user profile' },
  { permission: 'users.read', capability: 'USER_READ', category: 'user', description: 'View users' },
  { permission: 'users.update', capability: 'USER_UPDATE', category: 'user', description: 'Update users' },
  { permission: 'users.view', capability: 'USER_VIEW', category: 'user', description: 'View users (alias)' },
];

async function createMissingCapabilities() {
  console.log('🔍 Phase 1 Task 1.3: Creating Missing Capabilities\n');
  console.log('=' .repeat(80));
  
  // Check existing capabilities
  const existingCapabilities = await prisma.roleCapability.findMany({
    select: { name: true },
  });
  
  const existingNames = new Set(existingCapabilities.map(c => c.name));
  
  console.log(`\n📊 Current state:`);
  console.log(`   - Existing capabilities: ${existingNames.size}`);
  console.log(`   - Required capabilities: ${PERMISSION_CAPABILITY_MAP.length}`);
  
  // Find missing capabilities
  const missingCapabilities = PERMISSION_CAPABILITY_MAP.filter(
    m => !existingNames.has(m.capability)
  );
  
  console.log(`   - Missing capabilities: ${missingCapabilities.length}\n`);
  
  if (missingCapabilities.length === 0) {
    console.log('✅ All capabilities already exist in database!\n');
    return;
  }
  
  // Group by category
  const byCategory: Record<string, typeof missingCapabilities> = {};
  missingCapabilities.forEach(cap => {
    if (!byCategory[cap.category]) {
      byCategory[cap.category] = [];
    }
    byCategory[cap.category]!.push(cap);
  });
  
  console.log('📝 Creating missing capabilities:\n');
  
  let created = 0;
  
  for (const [category, capabilities] of Object.entries(byCategory)) {
    console.log(`\n📦 ${category.toUpperCase()} (${capabilities.length} capabilities):`);
    
    for (const cap of capabilities) {
      try {
        await prisma.roleCapability.create({
          data: {
            name: cap.capability,
            description: cap.description,
            category: cap.category,
          },
        });
        
        console.log(`   ✅ ${cap.capability.padEnd(30)} - ${cap.description}`);
        created++;
      } catch (error) {
        console.log(`   ❌ ${cap.capability} - Error: ${error}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Created ${created} new capabilities\n`);
  
  // Verify total count
  const finalCount = await prisma.roleCapability.count();
  console.log(`📊 Total capabilities in database: ${finalCount}\n`);
  
  // Show breakdown by category
  const categoryCounts = await prisma.roleCapability.groupBy({
    by: ['category'],
    _count: true,
  });
  
  console.log('📦 Breakdown by category:');
  categoryCounts
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    .forEach(({ category, _count }) => {
      console.log(`   - ${(category || 'uncategorized').padEnd(15)}: ${_count} capabilities`);
    });
  
  console.log('\n✅ PHASE 1 TASK 1.3 COMPLETE\n');
  console.log('Next steps:');
  console.log('  1. Map RolePermissions → RoleCapabilityAssignments');
  console.log('  2. Begin Phase 2: Update Database & Types');
  console.log('');
}

createMissingCapabilities()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
