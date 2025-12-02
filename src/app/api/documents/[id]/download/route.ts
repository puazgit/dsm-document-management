import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/documents/[id]/download - Download document file
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get document with access control check
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = 
      document.isPublic ||
      document.createdById === session.user.id ||
      document.accessGroups.includes(session.user.groupId || '') ||
      document.accessGroups.includes(session.user.role || '') ||
      ['administrator', 'ADMIN', 'admin'].includes(session.user.role);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check download permissions from database
    console.log('🔍 Checking download permissions for user:', session.user.email, 'role:', session.user.role);
    
    let canDownload = false;
    
    // Document owner can always download
    if (document.createdById === session.user.id) {
      console.log('✅ Download allowed: Document owner');
      canDownload = true;
    } else {
      // Check database permissions
      const userWithPermissions = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: {
          userRoles: {
            where: { isActive: true },
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

      if (userWithPermissions) {
        const permissions = userWithPermissions.userRoles.flatMap(userRole => 
          userRole.role.rolePermissions.map(rp => rp.permission.name)
        );
        
        const hasPdfDownload = permissions.includes('pdf.download');
        const hasDocDownload = permissions.includes('documents.download');
        
        console.log('📄 User permissions:', permissions.filter(p => p.includes('pdf') || p.includes('download')));
        console.log('🔑 PDF download permission:', hasPdfDownload);
        console.log('📁 Document download permission:', hasDocDownload);
        
        canDownload = hasPdfDownload || hasDocDownload;
        
        if (canDownload) {
          console.log('✅ Download allowed: User has database permissions');
        }
      }
    }

    if (!canDownload) {
      console.log('❌ Download denied: No permissions found');
      return NextResponse.json({ 
        error: 'Download not allowed for your role', 
        message: `Users with role '${session.user.role}' do not have download permissions. Contact an administrator for access.`,
        allowedActions: ['view']
      }, { status: 403 });
    }

    // Check if file exists
    const filePath = join(process.cwd(), document.filePath.replace(/^\//, ''));
    
    try {
      const fileBuffer = await readFile(filePath);
      
      // Increment download count
      await prisma.document.update({
        where: { id },
        data: { downloadCount: { increment: 1 } },
      });

      // Log download activity
      await prisma.documentActivity.create({
        data: {
          documentId: id,
          userId: session.user.id,
          action: 'DOWNLOAD',
          description: `Document "${document.title}" was downloaded`,
        },
      });

      // Set appropriate headers for file download
      const headers = new Headers();
      headers.set('Content-Type', document.mimeType || 'application/octet-stream');
      headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`);
      headers.set('Content-Length', fileBuffer.length.toString());

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('File not found:', fileError);
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}