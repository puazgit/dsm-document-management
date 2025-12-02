"use client"

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardStats } from "../../components/ui/dashboard-stats"
import { RecentDocuments } from "../../components/ui/recent-documents"
import { ActivityFeed } from "../../components/ui/activity-feed"
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Documents - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentDocuments />
          </div>

          {/* Activity Feed - Takes 1 column */}
          <div>
            <ActivityFeed />
          </div>
        </div>

        {/* Development Status */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              🎉 Enhanced Dashboard Complete!
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              Full-featured dashboard with responsive navigation and real-time updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-3 font-semibold text-green-800">✅ New Features:</h4>
                <ul className="space-y-1 text-sm text-green-700">
                  <li>• Responsive sidebar navigation</li>
                  <li>• User menu with dropdown</li>
                  <li>• Statistics overview cards</li>
                  <li>• Recent documents table</li>
                  <li>• Real-time activity feed</li>
                  <li>• Mobile-responsive design</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 font-semibold text-blue-800">� Ready to Use:</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Navigation: Sidebar with 7 menu items</li>
                  <li>• Layout: Mobile & desktop responsive</li>
                  <li>• Components: Reusable UI library</li>
                  <li>• Notifications: Badge with count</li>
                  <li>• User Experience: Smooth interactions</li>
                  <li>• Design: Modern and professional</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}