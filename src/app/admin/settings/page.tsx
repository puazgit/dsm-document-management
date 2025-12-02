'use client'

import { useState, useEffect } from 'react'
import { withAuth } from '@/components/auth/with-auth'
import { DashboardLayout } from '@/components/ui/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  Settings, 
  Save, 
  Database,
  Mail,
  Shield,
  Globe,
  HardDrive,
  Bell,
  Palette,
  Users,
  AlertTriangle
} from 'lucide-react'

interface SystemConfig {
  id: string
  key: string
  value: string
  description: string
  category: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

interface ConfigFormData {
  siteName: string
  siteDescription: string
  adminEmail: string
  maxFileSize: string
  allowedFileTypes: string
  sessionTimeout: string
  enableRegistration: boolean
  enableEmailVerification: boolean
  enableAuditLogging: boolean
  maxLoginAttempts: string
  passwordMinLength: string
  requirePasswordComplexity: boolean
  backupFrequency: string
  retentionPeriod: string
}

function SystemSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const { toast } = useToast()

  const [formData, setFormData] = useState<ConfigFormData>({
    siteName: '',
    siteDescription: '',
    adminEmail: '',
    maxFileSize: '',
    allowedFileTypes: '',
    sessionTimeout: '',
    enableRegistration: false,
    enableEmailVerification: false,
    enableAuditLogging: true,
    maxLoginAttempts: '',
    passwordMinLength: '',
    requirePasswordComplexity: false,
    backupFrequency: '',
    retentionPeriod: ''
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
        
        // Populate form with existing configs
        const configMap = data.configs.reduce((acc: any, config: SystemConfig) => {
          acc[config.key] = config.value
          return acc
        }, {})

        setFormData({
          siteName: configMap.site_name || 'DSM Document Management',
          siteDescription: configMap.site_description || 'Document Management System',
          adminEmail: configMap.admin_email || 'admin@dsm.com',
          maxFileSize: configMap.max_file_size || '50',
          allowedFileTypes: configMap.allowed_file_types || 'pdf,doc,docx,xls,xlsx,ppt,pptx',
          sessionTimeout: configMap.session_timeout || '7200',
          enableRegistration: configMap.enable_registration === 'true',
          enableEmailVerification: configMap.enable_email_verification === 'true',
          enableAuditLogging: configMap.enable_audit_logging !== 'false',
          maxLoginAttempts: configMap.max_login_attempts || '5',
          passwordMinLength: configMap.password_min_length || '8',
          requirePasswordComplexity: configMap.require_password_complexity === 'true',
          backupFrequency: configMap.backup_frequency || 'daily',
          retentionPeriod: configMap.retention_period || '365'
        })
      } else {
        throw new Error('Failed to fetch configs')
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const configUpdates = [
        { key: 'site_name', value: formData.siteName, category: 'general' },
        { key: 'site_description', value: formData.siteDescription, category: 'general' },
        { key: 'admin_email', value: formData.adminEmail, category: 'general' },
        { key: 'max_file_size', value: formData.maxFileSize, category: 'upload' },
        { key: 'allowed_file_types', value: formData.allowedFileTypes, category: 'upload' },
        { key: 'session_timeout', value: formData.sessionTimeout, category: 'security' },
        { key: 'enable_registration', value: formData.enableRegistration.toString(), category: 'security' },
        { key: 'enable_email_verification', value: formData.enableEmailVerification.toString(), category: 'security' },
        { key: 'enable_audit_logging', value: formData.enableAuditLogging.toString(), category: 'security' },
        { key: 'max_login_attempts', value: formData.maxLoginAttempts, category: 'security' },
        { key: 'password_min_length', value: formData.passwordMinLength, category: 'security' },
        { key: 'require_password_complexity', value: formData.requirePasswordComplexity.toString(), category: 'security' },
        { key: 'backup_frequency', value: formData.backupFrequency, category: 'system' },
        { key: 'retention_period', value: formData.retentionPeriod, category: 'system' }
      ]

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ configs: configUpdates })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'System settings updated successfully'
        })
        fetchConfigs() // Refresh data
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to update system settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p>Loading system settings...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Settings</h1>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              File Upload
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={formData.siteName}
                      onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="Enter site name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="Enter admin email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={formData.siteDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, siteDescription: e.target.value }))}
                    placeholder="Enter site description"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (seconds)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={formData.sessionTimeout}
                      onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                      placeholder="7200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={formData.maxLoginAttempts}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Password Min Length</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={formData.passwordMinLength}
                      onChange={(e) => setFormData(prev => ({ ...prev, passwordMinLength: e.target.value }))}
                      placeholder="8"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="requirePasswordComplexity"
                      checked={formData.requirePasswordComplexity}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requirePasswordComplexity: checked }))}
                    />
                    <Label htmlFor="requirePasswordComplexity">Require Password Complexity</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableRegistration"
                      checked={formData.enableRegistration}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableRegistration: checked }))}
                    />
                    <Label htmlFor="enableRegistration">Enable User Registration</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableEmailVerification"
                      checked={formData.enableEmailVerification}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableEmailVerification: checked }))}
                    />
                    <Label htmlFor="enableEmailVerification">Enable Email Verification</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enableAuditLogging"
                      checked={formData.enableAuditLogging}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableAuditLogging: checked }))}
                    />
                    <Label htmlFor="enableAuditLogging">Enable Audit Logging</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  File Upload Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                    <Input
                      id="maxFileSize"
                      type="number"
                      value={formData.maxFileSize}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxFileSize: e.target.value }))}
                      placeholder="50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
                  <Input
                    id="allowedFileTypes"
                    value={formData.allowedFileTypes}
                    onChange={(e) => setFormData(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
                    placeholder="pdf,doc,docx,xls,xlsx,ppt,pptx"
                  />
                  <p className="text-sm text-muted-foreground">
                    Comma-separated list of allowed file extensions
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">Backup Frequency</Label>
                    <Select
                      value={formData.backupFrequency}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, backupFrequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select backup frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retentionPeriod">Data Retention (days)</Label>
                    <Input
                      id="retentionPeriod"
                      type="number"
                      value={formData.retentionPeriod}
                      onChange={(e) => setFormData(prev => ({ ...prev, retentionPeriod: e.target.value }))}
                      placeholder="365"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">System Maintenance</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          Changes to system settings may require a restart to take effect.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default withAuth(SystemSettingsPage, { requiredRoles: ['administrator', 'admin', 'org_administrator'] })