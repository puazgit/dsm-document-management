import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import { prisma } from '@/lib/prisma';
import { hasCapability, type CapabilityUser } from '@/lib/capabilities';

// GET /api/admin/rbac/capabilities - List all capabilities
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage workflows or roles
    const capUser: CapabilityUser = { 
      id: session.user.id, 
      email: session.user.email || '', 
      roles: [] 
    };
    
    const canManage = await hasCapability(capUser, 'WORKFLOW_MANAGE') || 
                      await hasCapability(capUser, 'ROLE_MANAGE') ||
                      await hasCapability(capUser, 'ADMIN_ACCESS');
    
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get all capabilities
    const capabilities = await prisma.roleCapability.findMany({
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({ 
      capabilities: capabilities.map(cap => ({
        name: cap.name,
        description: cap.description || '',
        category: cap.category || 'other'
      }))
    });
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
