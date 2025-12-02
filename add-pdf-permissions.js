const { PrismaClient } = require('@prisma/client');

async function addPdfPermissionsToRoles() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔧 Adding PDF permissions to organizational roles...\n');
        
        // Get PDF permissions
        const pdfPermissions = await prisma.permission.findMany({
            where: {
                name: {
                    in: ['pdf.download', 'pdf.print', 'pdf.copy', 'pdf.view', 'documents.download']
                }
            }
        });
        
        console.log('📝 Found PDF permissions:', pdfPermissions.map(p => p.name));
        
        // Define roles that should have PDF permissions
        const rolesToUpdate = [
            'org_administrator', // System Administrator
            'org_gm',           // General Manager
            'org_manager',      // Manager
            'org_dirut',        // Direktur Utama
            'org_komite_audit', // Komite Audit
            'org_dewas',        // Dewan Pengawas
            'org_supervisor',   // Supervisor
            'org_finance',      // Finance & Accounting
            'org_ppd',          // PPD
            'org_hrd',          // HR
            'org_sekretaris'    // Sekretaris
        ];
        
        for (const roleName of rolesToUpdate) {
            console.log(`\n🔄 Processing role: ${roleName}`);
            
            const role = await prisma.role.findUnique({
                where: { name: roleName }
            });
            
            if (!role) {
                console.log(`   ❌ Role ${roleName} not found`);
                continue;
            }
            
            // Add PDF permissions to this role
            for (const permission of pdfPermissions) {
                try {
                    await prisma.rolePermission.upsert({
                        where: {
                            roleId_permissionId: {
                                roleId: role.id,
                                permissionId: permission.id
                            }
                        },
                        update: {
                            isGranted: true
                        },
                        create: {
                            roleId: role.id,
                            permissionId: permission.id,
                            isGranted: true
                        }
                    });
                    console.log(`   ✅ Added ${permission.name}`);
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`   ℹ️  ${permission.name} already exists`);
                    } else {
                        console.log(`   ❌ Error adding ${permission.name}:`, error.message);
                    }
                }
            }
        }
        
        console.log('\n✅ PDF permissions have been added to organizational roles!');
        console.log('\nNote: org_staff and org_guest roles intentionally left without PDF download permissions');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addPdfPermissionsToRoles();