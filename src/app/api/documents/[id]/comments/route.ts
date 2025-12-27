import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/next-auth';
import { prisma } from '../../../../../lib/prisma';
import { z } from 'zod';

// Validation schema for comments
const CommentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
  parentId: z.string().cuid().optional(),
});

// GET /api/documents/[id]/comments - Get document comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check if document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check access permissions
    const hasAccess = 
      document.isPublic ||
      document.createdById === session.user.id ||
      document.accessGroups.includes(session.user.groupId || '') ||
      session.user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get comments
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          documentId,
          parentId: null, // Only top-level comments
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      prisma.comment.count({
        where: {
          documentId,
          parentId: null,
        },
      }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents/[id]/comments - Create new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: documentId } = params;
    const body = await request.json();
    const data = CommentCreateSchema.parse(body);

    // Check if document exists and user has access
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
      session.user.role === 'ADMIN';

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If this is a reply, check if parent comment exists
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });

      if (!parentComment || parentComment.documentId !== documentId) {
        return NextResponse.json({ error: 'Invalid parent comment' }, { status: 400 });
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        ...data,
        documentId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    // Log comment activity only for published documents
    if (document.status === 'PUBLISHED') {
      await prisma.documentActivity.create({
        data: {
          documentId,
          userId: session.user.id,
          action: 'COMMENT',
          description: data.parentId 
            ? `Replied to a comment on document "${document.title}"`
            : `Added a comment to document "${document.title}"`,
        },
      });
    }

    // Create notification for document owner (if not the commenter)
    if (document.createdById !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: document.createdById,
          type: data.parentId ? 'COMMENT_REPLIED' : 'COMMENT_ADDED',
          title: data.parentId ? 'New reply on your document' : 'New comment on your document',
          message: `${session.user.name} ${data.parentId ? 'replied to a comment' : 'commented'} on "${document.title}"`,
          data: {
            documentId,
            commentId: comment.id,
            commenterId: session.user.id,
          },
        },
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid comment data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}