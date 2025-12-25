/**
 * 🎨 UI Role Visibility Hook
 * 
 * Provides role-based visibility controls for components
 * Handles dynamic menu hiding/showing, conditional rendering,
 * feature toggles, and navigation adaptation
 */

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { ROLES, hasRoleAccess } from '@/config/roles';

interface RoleVisibilityConfig {
  // Component visibility
  showComponent: (requiredRoles: string[]) => boolean;
  hideComponent: (forbiddenRoles: string[]) => boolean;
  
  // Feature toggles
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
  
  // UI adaptations
  userLevel: number;
  isAdmin: boolean;
  isManager: boolean;
  isGuest: boolean;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

export function useRoleVisibility(): RoleVisibilityConfig {
  const { data: session, status } = useSession();
  
  return useMemo(() => {
    const userRole = session?.user?.role || 'org_guest';
    const userPermissions = session?.user?.permissions || [];
    const roleConfig = ROLES[userRole as keyof typeof ROLES];
    const userLevel = roleConfig?.level || 0;
    
    // Helper functions
    const showComponent = (requiredRoles: string[]): boolean => {
      if (!session) return false;
      return hasRoleAccess(userRole, requiredRoles);
    };
    
    const hideComponent = (forbiddenRoles: string[]): boolean => {
      if (!session) return true;
      return !hasRoleAccess(userRole, forbiddenRoles);
    };
    
    const hasPermission = (permission: string): boolean => {
      if (!userPermissions.length) return false;
      
      // Check for wildcard permissions (admin)
      if (userPermissions.includes('*')) return true;
      
      // Check exact permission
      if (userPermissions.includes(permission)) return true;
      
      // Check module wildcard (e.g., "documents.*" covers "documents.create")
      const [module] = permission.split('.');
      if (userPermissions.includes(`${module}.*`)) return true;
      
      return false;
    };
    
    const hasAnyPermission = (permissions: string[]): boolean => {
      return permissions.some(perm => hasPermission(perm));
    };
    
    const hasAllPermissions = (permissions: string[]): boolean => {
      return permissions.every(perm => hasPermission(perm));
    };
    
    // Role classifications
    const adminRoles = ['admin', 'org_administrator', 'ppd.pusat', 'org_ppd'];
    const managerRoles = ['admin', 'org_administrator', 'org_ppd', 'ppd.pusat', 'org_manager', 'org_kadiv'];
    const guestRoles = ['org_guest', 'viewer'];
    
    const isAdmin = adminRoles.includes(userRole);
    const isManager = managerRoles.includes(userRole);
    const isGuest = guestRoles.includes(userRole);
    
    // Feature permissions
    const canUpload = hasAnyPermission(['documents.create', '*']) || showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd', 'org_kadiv', 'org_manager']);
    const canEdit = hasAnyPermission(['documents.update', '*']) || showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd', 'org_kadiv']);
    const canDelete = hasAnyPermission(['documents.delete', '*']) || showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd']);
    const canApprove = hasAnyPermission(['documents.approve', '*']) || showComponent(['admin', 'org_administrator', 'org_kadiv', 'org_gm', 'org_dirut']);
    const canViewAnalytics = hasAnyPermission(['analytics.read', '*']) || showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd', 'org_manager', 'org_kadiv']);
    const canManageUsers = hasAnyPermission(['users.create', 'users.update', '*']) || showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd']);
    const canAccessAdmin = showComponent(['admin', 'org_administrator', 'ppd.pusat', 'org_ppd']);
    
    // Navigation visibility
    const showAdminNav = canAccessAdmin;
    const showUploadButton = canUpload;
    const showAdvancedFeatures = !isGuest;
    
    return {
      // Component visibility functions
      showComponent,
      hideComponent,
      
      // Feature toggles
      canUpload,
      canEdit,
      canDelete,
      canApprove,
      canViewAnalytics,
      canManageUsers,
      canAccessAdmin,
      
      // Navigation
      showAdminNav,
      showUploadButton,
      showAdvancedFeatures,
      
      // UI adaptations
      userLevel,
      isAdmin,
      isManager,
      isGuest,
      
      // Permission checks
      hasPermission,
      hasAnyPermission,
      hasAllPermissions
    };
  }, [session, status]);
}

/**
 * Higher-order component for conditional rendering based on roles
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