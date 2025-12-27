import { DashboardLayout } from '@/components/ui/dashboard-layout'

export default function DocumentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
