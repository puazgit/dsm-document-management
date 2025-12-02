import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../../lib/next-auth'
import { prisma } from '../../../../lib/prisma'
import { auditHelpers, createAuditLog, AuditAction, AuditResource } from '../../../../lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const userRole = session.user.role?.toLowerCase()
    if (userRole !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    // Fetch all system configurations
    const configs = await prisma.systemConfig.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    })

    // Log audit - system configuration access
    await createAuditLog({
      action: AuditAction.READ,
      resource: AuditResource.USER,
      actorId: session.user.id,
      details: { action: 'System configurations viewed' },
    })

    return NextResponse.json({
      success: true,
      configs
    })
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin permissions
    const userRole = session.user.role?.toLowerCase()
    if (userRole !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { configs } = await request.json()

    if (!configs || !Array.isArray(configs)) {
      return NextResponse.json(
        { message: 'Invalid configs data' },
        { status: 400 }
      )
    }

    // Update or create configurations
    for (const config of configs) {
      const { key, value, category, description } = config

      await prisma.systemConfig.upsert({
        where: { key },
        update: {
          value,
          category: category || 'general',
          updatedAt: new Date()
        },
        create: {
          key,
          value,
          dataType: 'string',
          category: category || 'general',
          description: description || `${key} configuration`,
          isEditable: true
        }
      })

      // Log audit for each config change
      await createAuditLog({
        action: AuditAction.UPDATE,
        resource: AuditResource.USER, // TODO: Add SYSTEM_CONFIG to AuditResource enum
        resourceId: key,
        actorId: session.user.id,
        details: { key, value, category }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}