const { PrismaClient } = require('@prisma/client');

async function addDownloadToViewerRole() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Adding download permissions to viewer role...\n');
        
        // Get viewer role
        const viewerRole = await prisma.role.findUnique({
            where: { name: 'viewer' }
        });
        
        if (!viewerRole) {
            console.log('❌ Viewer role not found');
            return;
        }
        
        // Get download permissions
        const downloadPermissions = await prisma.permission.findMany({
            where: {
                name: {
                    in: ['pdf.download', 'documents.download']
                }
            }
        });
        
        console.log('📝 Found download permissions:', downloadPermissions.map(p => p.name));
        
        // Add download permissions to viewer role
        for (const permission of downloadPermissions) {
            try {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: viewerRole.id,
                            permissionId: permission.id
                        }
                    },
                    update: {
                        isGranted: true
                    },
                    create: {
                        roleId: viewerRole.id,
                        permissionId: permission.id,
                        isGranted: true
                    }
                });
                console.log(`✅ Added ${permission.name} to viewer role`);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log(`ℹ️  ${permission.name} already exists for viewer`);
                } else {
                    console.log(`❌ Error adding ${permission.name}:`, error.message);
                }
            }
        }
        
        console.log('\n✅ Viewer role now has download permissions!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addDownloadToViewerRole();