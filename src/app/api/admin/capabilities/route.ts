import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { canManageRoles, clearCapabilityCache, type CapabilityUser } from '@/lib/capabilities';
import { z } from 'zod';

const capabilitySchema = z.object({
  name: z.string().min(3).max(100).regex(/^[A-Z_]+$/, 'Must be uppercase with underscores'),
  description: z.string().min(3).max(500),
  category: z.enum(['system', 'document', 'user']).optional(),
});

const assignmentSchema = z.object({
  roleId: z.string(),
  capabilityId: z.string(),
});

// GET /api/admin/capabilities - List all capabilities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage roles
    const capUser: CapabilityUser = { id: session.user.id, email: session.user.email || '', roles: [] };
    if (!(await canManageRoles(capUser))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeAssignments = searchParams.get('includeAssignments') === 'true';

    const capabilities = await prisma.roleCapability.findMany({
      include: includeAssignments ? {
        assignments: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                level: true
              }
            }
          }
        }
      } : undefined,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ capabilities });
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/capabilities - Create new capability
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
    const validatedData = capabilitySchema.parse(body);

    // Check if capability already exists
    const existing = await prisma.roleCapability.findUnique({
      where: { name: validatedData.name }
    });

    if (existing) {
      return NextResponse.json({ error: 'Capability already exists' }, { status: 400 });
    }

    const capability = await prisma.roleCapability.create({
      data: validatedData
    });

    return NextResponse.json({ capability }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error creating capability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/capabilities - Delete capability
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
      return NextResponse.json({ error: 'Capability ID required' }, { status: 400 });
    }

    // Delete assignments first
    await prisma.roleCapabilityAssignment.deleteMany({
      where: { capabilityId: id }
    });

    // Delete capability
    await prisma.roleCapability.delete({
      where: { id }
    });

    // Clear cache
    clearCapabilityCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting capability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
