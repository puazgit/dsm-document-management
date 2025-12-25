import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { canManageRoles, clearCapabilityCache, type CapabilityUser } from '@/lib/capabilities';
import { z } from 'zod';

const assignmentSchema = z.object({
  roleId: z.string(),
  capabilityIds: z.array(z.string()),
});

// POST /api/admin/capabilities/assign - Assign capabilities to role
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
    const { roleId, capabilityIds } = assignmentSchema.parse(body);

    // Delete existing assignments
    await prisma.roleCapabilityAssignment.deleteMany({
      where: { roleId }
    });

    // Create new assignments
    const assignments = await Promise.all(
      capabilityIds.map(capabilityId =>
        prisma.roleCapabilityAssignment.create({
          data: { roleId, capabilityId }
        })
      )
    );

    // Clear cache
    clearCapabilityCache();

    return NextResponse.json({ assignments });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Error assigning capabilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
