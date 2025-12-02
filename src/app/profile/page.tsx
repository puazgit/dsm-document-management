'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { User, Shield, Camera, Lock } from 'lucide-react'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState('profile')

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session?.user) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please sign in to view your profile.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  const user = session.user

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={''} alt={user.name || 'User'} />
                  <AvatarFallback className="text-lg">
                    {user.name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <AvatarUpload
                  currentAvatar={''}
                  onAvatarChange={(newAvatar: string) => {
                    // TODO: Update session with new avatar
                    console.log('New avatar:', newAvatar)
                  }}
                />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {user.name || 'Unknown User'}
                </h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    {user.role || 'User'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="avatar" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Avatar</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center space-x-2">
              <Lock className="h-4 w-4" />
              <span>Password</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <EditProfileForm user={user} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="avatar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={''} alt={user.name || 'User'} />
                    <AvatarFallback className="text-2xl">
                      {user.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <AvatarUpload
                    currentAvatar={''}
                    onAvatarChange={(newAvatar: string) => {
                      // TODO: Update session with new avatar
                      console.log('New avatar:', newAvatar)
                    }}
                    variant="large"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm userId={user.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}