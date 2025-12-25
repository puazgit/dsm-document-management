"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardStats } from "../../components/ui/dashboard-stats"
import { RecentDocuments } from "../../components/ui/recent-documents"
import { ActivityFeed } from "../../components/ui/activity-feed"
import { DocumentStatusChart } from "../../components/ui/document-status-chart"
import { MonthlyTrendChart } from "../../components/ui/monthly-trend-chart"
import { PendingApprovals } from "../../components/ui/pending-approvals"
import { UserPerformanceWidget } from "../../components/ui/user-performance"
import { NotificationsWidget } from "../../components/ui/notifications-widget"
import { DocumentTimeline } from "../../components/ui/document-timeline"
import { TopDocuments } from "../../components/ui/top-documents"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { SidebarProvider, SidebarInset } from '../../components/ui/sidebar'
import { AppSidebar } from '../../components/app-sidebar'
import { Header } from '../../components/ui/header';
import { Spinner } from '../../components/ui/loading';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  // Security: Disable right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Security: Disable certain keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Disable F12 (DevTools), Ctrl+Shift+I, Ctrl+U (View Source)
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'U')) {
      e.preventDefault();
      return false;
    }
    // Disable Ctrl+S (Save)
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      return false;
    }
    return true;
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="document-secure-page"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
            <div className="container mx-auto space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-muted-foreground">Here's an overview of your document management system.</p>
          </div>

          {/* Stats Cards */}
          <DashboardStats />

          {/* Top Documents Row - Most Viewed & Most Downloaded */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopDocuments type="views" />
            <TopDocuments type="downloads" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DocumentStatusChart />
            <MonthlyTrendChart />
          </div>

          {/* Performance & Notifications Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UserPerformanceWidget />
            <NotificationsWidget />
          </div>

          {/* Pending Approvals - Full Width */}
          <PendingApprovals />

          {/* Timeline & Recent Documents Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DocumentTimeline />
            <RecentDocuments />
          </div>

          {/* Activity Feed - Full Width */}
          <ActivityFeed />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}