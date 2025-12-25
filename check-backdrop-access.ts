import { prisma } from './src/lib/prisma';

(async () => {
  try {
    // Find BACKDROP document
    const backdropDoc = await prisma.document.findFirst({
      where: {
        title: {
          contains: 'BACKDROP',
          mode: 'insensitive'
        }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    if (!backdropDoc) {
      console.log('❌ Document "BACKDROP" not found');
      return;
    }
    
    // Get legal user
    const legalUser = await prisma.user.findUnique({
      where: { email: 'legal@dsm.com' },
      include: { 
        group: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@dsm.com' },
      include: { 
        group: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!legalUser) {
      console.log('❌ User legal@dsm.com not found');
      return;
    }
    
    if (!adminUser) {
      console.log('❌ User admin@dsm.com not found');
      return;
    }
    
    console.log('📄 Document Info:');
    console.log('- ID:', backdropDoc.id);
    console.log('- Title:', backdropDoc.title);
    console.log('- File:', backdropDoc.fileName);
    console.log('- Status:', backdropDoc.status);
    console.log('- Is Public:', backdropDoc.isPublic);
    console.log('- Access Groups:', JSON.stringify(backdropDoc.accessGroups));
    console.log('- Owner ID:', backdropDoc.createdById);
    console.log('- Owner Email:', backdropDoc.createdBy.email);
    
    console.log('\n👤 Legal User Info:');
    console.log('- ID:', legalUser.id);
    console.log('- Email:', legalUser.email);
    console.log('- Group ID:', legalUser.groupId);
    console.log('- Group Name:', legalUser.group?.name);
    console.log('- Roles:', legalUser.userRoles.map(ur => ur.role.name).join(', '));
    console.log('- Is Active:', legalUser.isActive);
    
    console.log('\n👤 Admin User Info:');
    console.log('- ID:', adminUser.id);
    console.log('- Email:', adminUser.email);
    console.log('- Group ID:', adminUser.groupId);
    console.log('- Group Name:', adminUser.group?.name);
    console.log('- Roles:', adminUser.userRoles.map(ur => ur.role.name).join(', '));
    console.log('- Is Active:', adminUser.isActive);
    
    console.log('\n🔍 Legal User Access Check:');
    const legalIsPublic = backdropDoc.isPublic;
    const legalIsOwner = backdropDoc.createdById === legalUser.id;
    const legalHasGroupIdAccess = backdropDoc.accessGroups.includes(legalUser.groupId || '');
    const legalHasGroupNameAccess = backdropDoc.accessGroups.includes(legalUser.group?.name || '');
    const legalHasRoleAccess = legalUser.userRoles.some(ur => backdropDoc.accessGroups.includes(ur.role.name));
    const legalIsAdmin = legalUser.userRoles.some(ur => ['admin', 'org_administrator'].includes(ur.role.name));
    
    console.log('- Is Public:', legalIsPublic ? '✅ YES' : '❌ NO');
    console.log('- Is Owner:', legalIsOwner ? '✅ YES' : '❌ NO');
    console.log('- Has Group ID Access:', legalHasGroupIdAccess ? '✅ YES' : '❌ NO');
    console.log('- Has Group Name Access:', legalHasGroupNameAccess ? '✅ YES' : '❌ NO');
    console.log('- Has Role Access:', legalHasRoleAccess ? '✅ YES' : '❌ NO');
    console.log('- Is Admin:', legalIsAdmin ? '✅ YES' : '❌ NO');
    
    const legalShouldHaveAccess = legalIsPublic || legalIsOwner || legalHasGroupIdAccess || legalHasGroupNameAccess || legalHasRoleAccess || legalIsAdmin;
    console.log('🎯 Legal Final Result:', legalShouldHaveAccess ? '✅ SHOULD HAVE ACCESS' : '❌ ACCESS DENIED');
    
    console.log('\n🔍 Admin User Access Check:');
    const adminIsPublic = backdropDoc.isPublic;
    const adminIsOwner = backdropDoc.createdById === adminUser.id;
    const adminHasGroupIdAccess = backdropDoc.accessGroups.includes(adminUser.groupId || '');
    const adminHasGroupNameAccess = backdropDoc.accessGroups.includes(adminUser.group?.name || '');
    const adminHasRoleAccess = adminUser.userRoles.some(ur => backdropDoc.accessGroups.includes(ur.role.name));
    const adminIsAdmin = adminUser.userRoles.some(ur => ['admin', 'org_administrator'].includes(ur.role.name));
    
    console.log('- Is Public:', adminIsPublic ? '✅ YES' : '❌ NO');
    console.log('- Is Owner:', adminIsOwner ? '✅ YES' : '❌ NO');
    console.log('- Has Group ID Access:', adminHasGroupIdAccess ? '✅ YES' : '❌ NO');
    console.log('- Has Group Name Access:', adminHasGroupNameAccess ? '✅ YES' : '❌ NO');
    console.log('- Has Role Access:', adminHasRoleAccess ? '✅ YES' : '❌ NO');
    console.log('- Is Admin:', adminIsAdmin ? '✅ YES' : '❌ NO');
    
    const adminShouldHaveAccess = adminIsPublic || adminIsOwner || adminHasGroupIdAccess || adminHasGroupNameAccess || adminHasRoleAccess || adminIsAdmin;
    console.log('🎯 Admin Final Result:', adminShouldHaveAccess ? '✅ SHOULD HAVE ACCESS' : '❌ ACCESS DENIED');
    
    console.log('\n📊 Comparison:');
    console.log('- Both should see Public document:', legalIsPublic && adminIsPublic ? '✅ YES' : '❌ NO');
    console.log('- Legal has same access as Admin:', legalShouldHaveAccess === adminShouldHaveAccess ? '✅ YES' : '❌ NO');
    
    if (!legalShouldHaveAccess && adminShouldHaveAccess) {
      console.log('\n⚠️  PROBLEM FOUND:');
      console.log('Admin can access but Legal cannot!');
      console.log('\nPossible reasons:');
      if (adminIsAdmin) console.log('- Admin has admin/org_administrator role (bypass)');
      if (adminIsOwner) console.log('- Admin is the document owner');
      if (!legalIsPublic) console.log('- Document is NOT public');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
