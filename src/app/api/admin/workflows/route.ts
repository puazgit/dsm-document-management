import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { canManageRoles, type CapabilityUser } from '@/lib/capabilities';
import { clearWorkflowCache } from '@/config/document-workflow';
import { z } from 'zod';

const transitionSchema = z.object({
  fromStatus: z.string(),
  toStatus: z.string(),
  minLevel: z.number().int().min(0).max(100),
  requiredPermission: z.string().optional().nullable(),
  description: z.string().min(3).max(500),
  allowedByLabel: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

// GET /api/admin/workflows - List all workflow transitions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    if (!(await canManageRoles(capUser))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const transitions = await prisma.workflowTransition.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { fromStatus: 'asc' }
      ]
    });

    return NextResponse.json({ transitions });
  } catch (error) {
    console.error('Error fetching workflow transitions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/workflows - Create new workflow transition
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    if (!(await canManageRoles(capUser))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = transitionSchema.parse(body);

    // Check if transition already exists
    const existing = await prisma.workflowTransition.findUnique({
      where: {
        fromStatus_toStatus: {
          fromStatus: validatedData.fromStatus,
          toStatus: validatedData.toStatus
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Transition already exists' }, { status: 400 });
    }

    const transition = await prisma.workflowTransition.create({
      data: validatedData
    });

    // Clear workflow cache
    clearWorkflowCache();

    return NextResponse.json({ transition }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error creating workflow transition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/workflows - Update workflow transition
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    if (!(await canManageRoles(capUser))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Transition ID required' }, { status: 400 });
    }

    const transition = await prisma.workflowTransition.update({
      where: { id },
      data: updateData
    });

    // Clear workflow cache
    clearWorkflowCache();

    return NextResponse.json({ transition });
  } catch (error) {
    console.error('Error updating workflow transition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/workflows - Delete workflow transition
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    if (!(await canManageRoles(capUser))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transition ID required' }, { status: 400 });
    }

    await prisma.workflowTransition.delete({
      where: { id }
    });

    // Clear workflow cache
    clearWorkflowCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow transition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
