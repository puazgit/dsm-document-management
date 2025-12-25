import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/roles/display-name/[roleName]
 * Fetches the display name for a given role from the database
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { roleName: string } }
) {
  try {
    const { roleName } = params;

    if (!roleName) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Try to fetch from Role table first
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      select: { displayName: true }
    });

    if (role) {
      return NextResponse.json({ 
        displayName: role.displayName,
        source: 'database'
      });
    }

    // If not found in roles, try groups (since groups act as roles)
    const group = await prisma.group.findUnique({
      where: { name: roleName },
      select: { displayName: true }
    });

    if (group) {
      return NextResponse.json({ 
        displayName: group.displayName,
        source: 'database'
      });
    }

    // Fallback: return capitalized role name
    const fallbackDisplayName = roleName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return NextResponse.json({ 
      displayName: fallbackDisplayName,
      source: 'fallback'
    });

  } catch (error) {
    console.error('Error fetching role display name:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role display name' },
      { status: 500 }
    );
  }
}
