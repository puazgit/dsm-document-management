"use client"

import { useState, useEffect, lazy, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { withAuth } from '@/components/auth/with-auth'
import { DashboardStats } from "../../components/ui/dashboard-stats"
import { Card, CardContent } from "../../components/ui/card"
import { Skeleton } from "../../components/ui/skeleton"

// Lazy load heavy components for better initial load performance
const RecentDocuments = lazy(() => import("../../components/ui/recent-documents").then(m => ({ default: m.RecentDocuments })))
const ActivityFeed = lazy(() => import("../../components/ui/activity-feed").then(m => ({ default: m.ActivityFeed })))
const DocumentStatusChart = lazy(() => import("../../components/ui/document-status-chart").then(m => ({ default: m.DocumentStatusChart })))
const MonthlyTrendChart = lazy(() => import("../../components/ui/monthly-trend-chart").then(m => ({ default: m.MonthlyTrendChart })))
const PendingApprovals = lazy(() => import("../../components/ui/pending-approvals").then(m => ({ default: m.PendingApprovals })))
const UserPerformanceWidget = lazy(() => import("../../components/ui/user-performance").then(m => ({ default: m.UserPerformanceWidget })))
const NotificationsWidget = lazy(() => import("../../components/ui/notifications-widget").then(m => ({ default: m.NotificationsWidget })))
const DocumentTimeline = lazy(() => import("../../components/ui/document-timeline").then(m => ({ default: m.DocumentTimeline })))
const TopDocuments = lazy(() => import("../../components/ui/top-documents").then(m => ({ default: m.TopDocuments })))

// Loading component for lazy loaded sections
const ChartSkeleton = () => (
  <Card>
    <CardContent className="pt-6">
      <Skeleton className="h-[300px] w-full" />
    </CardContent>
  </Card>
)

function DashboardPage() {
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
        <div className="w-8 h-8 border-b-2 border-gray-900 dark:border-gray-100 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="container mx-auto space-y-6 document-secure-page"
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground">Here's an overview of your document management system.</p>
      </div>

      {/* Stats Cards - Load immediately (most important) */}
      <DashboardStats />

      {/* Top Documents Row - Lazy loaded */}
      <Suspense fallback={<div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopDocuments type="views" />
          <TopDocuments type="downloads" />
        </div>
      </Suspense>

      {/* Charts Row - Lazy loaded */}
      <Suspense fallback={<div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DocumentStatusChart />
          <MonthlyTrendChart />
        </div>
      </Suspense>

      {/* Performance & Notifications Row - Lazy loaded */}
      <Suspense fallback={<div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UserPerformanceWidget />
          <NotificationsWidget />
        </div>
      </Suspense>

      {/* Pending Approvals - Lazy loaded */}
      <Suspense fallback={<ChartSkeleton />}>
        <PendingApprovals />
      </Suspense>

      {/* Timeline & Recent Documents Row - Lazy loaded */}
      <Suspense fallback={<div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DocumentTimeline />
          <RecentDocuments />
        </div>
      </Suspense>

      {/* Activity Feed - Lazy loaded last */}
      <Suspense fallback={<ChartSkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  )
}

// Export with authentication (no specific capabilities required)
// Dashboard is available to all authenticated users
export default withAuth(DashboardPage, {
  redirectTo: '/auth/login'
})