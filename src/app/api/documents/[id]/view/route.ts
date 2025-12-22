import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

// GET /api/documents/[id]/view - View document file (no download count increment)
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

    // Get user's group name from database for proper access check
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { group: true }
    });
    
    const userGroupName = userWithGroup?.group?.name;

    // Check access permissions
    const hasAccess = 
      document.isPublic ||
      document.createdById === session.user.id ||
      document.accessGroups.includes(session.user.groupId || '') ||
      document.accessGroups.includes(userGroupName || '') ||
      document.accessGroups.includes(session.user.role || '') ||
      ['admin', 'org_administrator'].includes(session.user.role);

    if (!hasAccess) {
      console.log('❌ View access denied. Checked:', {
        isPublic: document.isPublic,
        isOwner: document.createdById === session.user.id,
        groupIdMatch: document.accessGroups.includes(session.user.groupId || ''),
        groupNameMatch: document.accessGroups.includes(userGroupName || ''),
        roleMatch: document.accessGroups.includes(session.user.role || ''),
        isAdmin: ['admin', 'org_administrator'].includes(session.user.role)
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // All authenticated users with access can view documents
    // No role restrictions for viewing

    // Check if file exists
    const filePath = join(process.cwd(), document.filePath.replace(/^\//, ''));
    
    try {
      const fileBuffer = await readFile(filePath);
      
      // Increment view count (not download count)
      await prisma.document.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      // Log view activity
      await prisma.documentActivity.create({
        data: {
          documentId: id,
          userId: session.user.id,
          action: 'VIEW',
          description: `Document "${document.title}" was viewed`,
        },
      });

      // Set appropriate headers for inline viewing without download toolbar
      const headers = new Headers();
      headers.set('Content-Type', document.mimeType || 'application/pdf');
      headers.set('Content-Disposition', `inline; filename="${document.fileName}"`);
      headers.set('Content-Length', fileBuffer.length.toString());
      
      // Allow iframe embedding from same origin
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      headers.set('Content-Security-Policy', "frame-ancestors 'self'");
      
      // Enhanced security headers to prevent download prompts and hide PDF toolbar
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      
      // PDF-specific headers to disable toolbar and download
      headers.set('X-PDF-Toolbar', 'hide');
      headers.set('X-Robots-Tag', 'noindex, noarchive, nosnippet, noimageindex, nofollow');
      
      // Enhanced security headers to prevent unauthorized access
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('X-Frame-Options', 'SAMEORIGIN');
      headers.set('Referrer-Policy', 'same-origin');
      headers.set('Content-Security-Policy', "default-src 'self'; object-src 'self'; frame-ancestors 'self'");
      
      // Custom security markers
      headers.set('X-PDF-Security', 'role-protected');
      headers.set('X-Download-Control', 'authorized-only');

      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });

    } catch (fileError) {
      console.error('File not found:', fileError);
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error viewing document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents/[id]/view - Log document view activity
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get document
    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get user's group name from database for proper access check
    const userWithGroup = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { group: true }
    });
    
    const userGroupName = userWithGroup?.group?.name;

    // Check access permissions
    const hasAccess = 
      document.isPublic ||
      document.createdById === session.user.id ||
      document.accessGroups.includes(session.user.groupId || '') ||
      document.accessGroups.includes(userGroupName || '') ||
      document.accessGroups.includes(session.user.role || '') ||
      ['admin', 'org_administrator'].includes(session.user.role);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use transaction to ensure both activity log and counter are updated atomically
    const [_, activity] = await prisma.$transaction([
      // 1. Increment view count
      prisma.document.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }),
      
      // 2. Log view activity
      prisma.documentActivity.create({
        data: {
          documentId: id,
          userId: session.user.id,
          action: 'VIEW',
          description: `Document "${document.title}" was viewed`,
          metadata: {
            source: 'document_viewer',
            timestamp: new Date().toISOString()
          }
        },
      })
    ]);

    return NextResponse.json({ 
      success: true,
      activity: {
        id: activity.id,
        action: activity.action,
        createdAt: activity.createdAt
      }
    });

  } catch (error) {
    console.error('Error logging view activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}