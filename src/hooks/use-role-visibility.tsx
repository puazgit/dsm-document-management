/**
 * 🎨 UI Role Visibility Hook
 * 
 * ⚠️ DEPRECATION WARNING: This hook is maintained for backward compatibility only
 * 
 * MIGRATION STATUS: LEGACY - Uses capabilities internally
 * - All permission checks are mapped to capabilities
 * - Provides role-based visibility controls for components
 * - Handles dynamic menu hiding/showing, conditional rendering,
 * - Feature toggles, and navigation adaptation
 * 
 * ✅ RECOMMENDED: Use useCapabilities() directly for new code
 * - More explicit capability checks
 * - Better type safety
 * - Direct access to modern authorization system
 * 
 * @deprecated Consider using useCapabilities() directly for new code
 */

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { useCapabilities } from './use-capabilities';

interface RoleVisibilityConfig {
  // Component visibility (deprecated - use capabilities)
  showComponent: (requiredRoles: string[]) => boolean;
  hideComponent: (forbiddenRoles: string[]) => boolean;
  
  // Feature toggles (mapped from capabilities)
  canUpload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  
  // Navigation
  showAdminNav: boolean;
  showUploadButton: boolean;
  showAdvancedFeatures: boolean;
  
  // UI adaptations (derived from capabilities)
  userLevel: number;
  isAdmin: boolean;
  isManager: boolean;
  isGuest: boolean;
  
  // Permission checks (deprecated - use capabilities)
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export function useRoleVisibility(): RoleVisibilityConfig {
  const { data: session } = useSession();
  const capabilities = useCapabilities();
  
  return useMemo(() => {
    // Map capabilities to feature toggles
    const canUpload = capabilities.canCreateDocuments;
    const canEdit = capabilities.canEditDocuments;
    const canDelete = capabilities.canDeleteDocuments;
    const canApprove = capabilities.canApproveDocuments;
    const canViewAnalytics = capabilities.canViewDocuments || capabilities.canViewUsers;
    const canManageUsers = capabilities.canManageUsers;
    const canAccessAdmin = capabilities.showAdminNav;
    
    // Derive user level from capabilities
    let userLevel = 0;
    if (capabilities.isAdmin) userLevel = 100;
    else if (capabilities.isManager) userLevel = 70;
    else if (capabilities.canViewDocuments) userLevel = 30;
    else userLevel = 10;
    
    // Backward compatibility: role-based checks (now capability-backed)
    const showComponent = (requiredRoles: string[]): boolean => {
      if (!session) return false;
      
      // Map common role checks to capabilities
      const roleToCapabilityMap: Record<string, boolean> = {
        'admin': capabilities.isAdmin,
        'administrator': capabilities.isAdmin,
        'ppd.pusat': capabilities.canManageUsers || capabilities.canManageRoles,
        'ppd.unit': capabilities.canManageUsers,
        'manager': capabilities.isManager,
        'kadiv': capabilities.canApproveDocuments,
        'gm': capabilities.canApproveDocuments,
        'dirut': capabilities.canApproveDocuments,
      };
      
      return requiredRoles.some(role => roleToCapabilityMap[role.toLowerCase()] || false);
    };
    
    const hideComponent = (forbiddenRoles: string[]): boolean => {
      if (!session) return true;
      return !showComponent(forbiddenRoles);
    };
    
    // Permission checks (DEPRECATED - mapped to capabilities)
    // These functions map old permission strings to new capability checks
    const hasPermission = (permission: string): boolean => {
      // Map old permission strings to capabilities
      if (permission.includes('documents.read') || permission.includes('documents.view')) return capabilities.canViewDocuments;
      if (permission.includes('documents.create')) return capabilities.canCreateDocuments;
      if (permission.includes('documents.update') || permission.includes('documents.edit')) return capabilities.canEditDocuments;
      if (permission.includes('documents.delete')) return capabilities.canDeleteDocuments;
      if (permission.includes('documents.download')) return capabilities.canDownloadDocuments;
      if (permission.includes('documents.approve')) return capabilities.canApproveDocuments;
      if (permission.includes('documents.publish')) return capabilities.canPublishDocuments;
      if (permission.includes('pdf.view')) return capabilities.canViewPDF || capabilities.canViewDocuments;
      if (permission.includes('pdf.download')) return capabilities.canDownloadPDF || capabilities.canDownloadDocuments;
      if (permission.includes('pdf.print')) return capabilities.canPrintPDF;
      if (permission.includes('pdf.copy')) return capabilities.canCopyPDF;
      if (permission.includes('pdf.watermark')) return capabilities.canManagePDFWatermark;
      if (permission.includes('users.create') || permission.includes('users.update')) return capabilities.canManageUsers;
      if (permission === '*') return capabilities.isAdmin;
      return false;
    };
    
    const hasAnyPermission = (permissions: string[]): boolean => {
      return permissions.some(perm => hasPermission(perm));
    };
    
    const hasAllPermissions = (permissions: string[]): boolean => {
      return permissions.every(perm => hasPermission(perm));
    };
    
    return {
      // Component visibility functions
      showComponent,
      hideComponent,
      
      // Feature toggles (from capabilities)
      canUpload,
      canEdit,
      canDelete,
      canApprove,
      canViewAnalytics,
      canManageUsers,
      canAccessAdmin,
      
      // Navigation (from capabilities)
      showAdminNav: capabilities.showAdminNav,
      showUploadButton: capabilities.showUploadButton,
      showAdvancedFeatures: !capabilities.isViewer,
      
      // UI adaptations (from capabilities)
      userLevel,
      isAdmin: capabilities.isAdmin,
      isManager: capabilities.isManager,
      isGuest: capabilities.isViewer,
      
      // Permission checks (deprecated)
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    };
  }, [session, capabilities]);
}

/**
 * Higher-order component for conditional rendering based on roles
 * MIGRATED: Now uses CapabilityGuard internally
 * @deprecated Use CapabilityGuard from use-capabilities directly
 */
interface RoleGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  forbiddenRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  mode?: 'show' | 'hide';
}

export function RoleGuard({ 
  children, 
  requiredRoles = [], 
  forbiddenRoles = [],
  requiredPermissions = [],
  fallback = null,
  mode = 'show'
}: RoleGuardProps) {
  const { showComponent, hideComponent, hasAllPermissions } = useRoleVisibility();
  
  let shouldShow = true;
  
  // Check role requirements
  if (requiredRoles.length > 0) {
    shouldShow = shouldShow && showComponent(requiredRoles);
  }
  
  // Check forbidden roles
  if (forbiddenRoles.length > 0) {
    shouldShow = shouldShow && hideComponent(forbiddenRoles);
  }
  
  // Check permission requirements
  if (requiredPermissions.length > 0) {
    shouldShow = shouldShow && hasAllPermissions(requiredPermissions);
  }
  
  // Apply mode logic
  if (mode === 'hide') {
    shouldShow = !shouldShow;
  }
  
  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component for role-based feature flags
 */
interface FeatureToggleProps {
  children: React.ReactNode;
  feature: keyof Pick<RoleVisibilityConfig, 
    'canUpload' | 'canEdit' | 'canDelete' | 'canApprove' | 
    'canViewAnalytics' | 'canManageUsers' | 'canAccessAdmin'>;
  fallback?: React.ReactNode;
}

export function FeatureToggle({ children, feature, fallback = null }: FeatureToggleProps) {
  const roleVisibility = useRoleVisibility();
  const isEnabled = roleVisibility[feature];
  
  return isEnabled ? <>{children}</> : <>{fallback}</>;
}

/**
 * Hook for navigation visibility
 */
export function useNavigationVisibility() {
  const { showAdminNav, showUploadButton, showAdvancedFeatures, isAdmin, isManager, isGuest } = useRoleVisibility();
  
  return {
    // Main navigation items
    navigationItems: {
      documents: true, // Always show documents
      upload: showUploadButton,
      admin: showAdminNav,
      analytics: showAdvancedFeatures,
      profile: true, // Always show profile
    },
    
    // Sidebar sections
    sidebarSections: {
      documents: true,
      management: showAdvancedFeatures,
      administration: showAdminNav,
      analytics: showAdvancedFeatures,
    },
    
    // Quick actions
    quickActions: {
      upload: showUploadButton,
      bulkActions: !isGuest,
      advancedSearch: showAdvancedFeatures,
      export: showAdvancedFeatures,
    },
    
    // User context
    userContext: {
      isAdmin,
      isManager, 
      isGuest,
      showRoleIndicator: true,
    }
  };
}