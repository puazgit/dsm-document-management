import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/next-auth"
import { sikawanService } from "@/lib/sikawan-api"

/**
 * GET /api/admin/sikawan-users
 * Get list of SIKAWAN users pending role assignment
 */
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check authorization (admin only)
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    // Get pending SIKAWAN users
    const users = await sikawanService.getPendingSikawanUsers()

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching SIKAWAN users:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
