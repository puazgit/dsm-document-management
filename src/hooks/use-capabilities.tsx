/**
 * 🔐 Client-Side Capability Hook
 * 
 * Provides capability-based permission checks for React components
 * Uses session.user.capabilities from NextAuth session
 * Aligned with server-side requireCapability() pattern
 */

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

export type Capability = 
  | 'DOCUMENT_VIEW'
  | 'DOCUMENT_EDIT'
  | 'DOCUMENT_CREATE'
  | 'DOCUMENT_DELETE'
  | 'DOCUMENT_DOWNLOAD'
  | 'DOCUMENT_COMMENT'
  | 'DOCUMENT_APPROVE'
  | 'DOCUMENT_PUBLISH'
  | 'DOCUMENT_MANAGE'
  | 'DOCUMENT_FULL_ACCESS'
  | 'PDF_VIEW'
  | 'PDF_DOWNLOAD'
  | 'PDF_PRINT'
  | 'PDF_COPY'
  | 'PDF_WATERMARK'
  | 'USER_VIEW'
  | 'USER_MANAGE'
  | 'USER_DELETE'
  | 'ROLE_VIEW'
  | 'ROLE_MANAGE'
  | 'ADMIN_ACCESS'
  | 'SYSTEM_CONFIG'
  | 'PERMISSION_MANAGE'
  | 'PERMISSION_VIEW'
  | 'ORGANIZATION_MANAGE'
  | 'ORGANIZATION_VIEW'
  | 'ANALYTICS_VIEW'
  | 'ANALYTICS_EXPORT'
  | 'AUDIT_VIEW'
  | 'WORKFLOW_MANAGE';

interface CapabilityConfig {
  // Core capability checks
  hasCapability: (capability: Capability) => boolean;
  hasAnyCapability: (capabilities: Capability[]) => boolean;
  hasAllCapabilities: (capabilities: Capability[]) => boolean;
  
  // Feature toggles based on capabilities
  canViewDocuments: boolean;
  canEditDocuments: boolean;
  canCreateDocuments: boolean;
  canDeleteDocuments: boolean;
  canDownloadDocuments: boolean;
  canCommentDocuments: boolean;
  canApproveDocuments: boolean;
  canPublishDocuments: boolean;
  canManageDocuments: boolean;
  canViewPDF: boolean;
  canDownloadPDF: boolean;
  canPrintPDF: boolean;
  canCopyPDF: boolean;
  canManagePDFWatermark: boolean;
  canViewUsers: boolean;
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canViewRoles: boolean;
  canManageRoles: boolean;
  
  // Navigation visibility
  showUploadButton: boolean;
  showAdminNav: boolean;
  showUserManagement: boolean;
  showRoleManagement: boolean;
  
  // UI adaptations
  isAdmin: boolean;
  isManager: boolean;
  isViewer: boolean;
  
  // Session data
  userCapabilities: string[];
  userId: string | null;
  userEmail: string | null;
  userRole: string | null;
}

export function useCapabilities(): CapabilityConfig {
  const { data: session, status } = useSession();
  
  return useMemo(() => {
    const userCapabilities = (session?.user as any)?.capabilities || [];
    const userId = session?.user?.id || null;
    const userEmail = session?.user?.email || null;
    const userRole = (session?.user as any)?.role || null;
    
    // Core capability check functions
    const hasCapability = (capability: Capability): boolean => {
      if (!session?.user) return false;
      return userCapabilities.includes(capability);
    };
    
    const hasAnyCapability = (capabilities: Capability[]): boolean => {
      if (!session?.user) return false;
      return capabilities.some(cap => userCapabilities.includes(cap));
    };
    
    const hasAllCapabilities = (capabilities: Capability[]): boolean => {
      if (!session?.user) return false;
      return capabilities.every(cap => userCapabilities.includes(cap));
    };
    
    // Feature toggles based on capabilities
    const canViewDocuments = hasCapability('DOCUMENT_VIEW');
    const canEditDocuments = hasCapability('DOCUMENT_EDIT');
    const canCreateDocuments = hasCapability('DOCUMENT_CREATE');
    const canDeleteDocuments = hasCapability('DOCUMENT_DELETE');
    const canDownloadDocuments = hasCapability('DOCUMENT_DOWNLOAD');
    const canCommentDocuments = hasCapability('DOCUMENT_COMMENT');
    const canApproveDocuments = hasCapability('DOCUMENT_APPROVE');
    const canPublishDocuments = hasCapability('DOCUMENT_PUBLISH');
    const canManageDocuments = hasCapability('DOCUMENT_MANAGE');
    
    // PDF-specific capabilities
    const canViewPDF = hasCapability('PDF_VIEW');
    const canDownloadPDF = hasCapability('PDF_DOWNLOAD');
    const canPrintPDF = hasCapability('PDF_PRINT');
    const canCopyPDF = hasCapability('PDF_COPY');
    const canManagePDFWatermark = hasCapability('PDF_WATERMARK');
    
    const canViewUsers = hasCapability('USER_VIEW');
    const canManageUsers = hasCapability('USER_MANAGE');
    const canDeleteUsers = hasCapability('USER_DELETE');
    const canViewRoles = hasCapability('ROLE_VIEW');
    const canManageRoles = hasCapability('ROLE_MANAGE');
    
    const isAdmin = hasCapability('ADMIN_ACCESS');
    const canConfigureSystem = hasCapability('SYSTEM_CONFIG');
    
    // Navigation visibility
    const showUploadButton = canCreateDocuments;
    const showAdminNav = canViewUsers || canManageUsers || canViewRoles || canManageRoles || isAdmin;
    const showUserManagement = canViewUsers || canManageUsers;
    const showRoleManagement = canViewRoles || canManageRoles;
    
    // UI classifications
    const isManager = (canCreateDocuments && canApproveDocuments) || canManageDocuments;
    const isViewer = canViewDocuments && !canEditDocuments && !canCreateDocuments;
    
    return {
      // Core capability checks
      hasCapability,
      hasAnyCapability,
      hasAllCapabilities,
      
      // Feature toggles - Documents
      canViewDocuments,
      canEditDocuments,
      canCreateDocuments,
      canDeleteDocuments,
      canDownloadDocuments,
      canCommentDocuments,
      canApproveDocuments,
      canPublishDocuments,
      canManageDocuments,
      
      // PDF-specific features
      canViewPDF,
      canDownloadPDF,
      canPrintPDF,
      canCopyPDF,
      canManagePDFWatermark,
      
      // User & Role management
      canViewUsers,
      canManageUsers,
      canDeleteUsers,
      canViewRoles,
      canManageRoles,
      
      // System administration
      isAdmin,
      canConfigureSystem,
      
      // Navigation
      showUploadButton,
      showAdminNav,
      showUserManagement,
      showRoleManagement,
      
      // UI adaptations
      isManager,
      isViewer,
      
      // Session data
      userCapabilities,
      userId,
      userEmail,
      userRole,
    };
  }, [session, status]);
}

/**
 * React component for capability-based conditional rendering
 */
interface CapabilityGuardProps {
  children: React.ReactNode;
  capability?: Capability;
  anyOf?: Capability[];
  allOf?: Capability[];
  fallback?: React.ReactNode;
}

export function CapabilityGuard({ 
  children, 
  capability,
  anyOf,
  allOf,
  fallback = null 
}: CapabilityGuardProps): JSX.Element | null {
  const { hasCapability, hasAnyCapability, hasAllCapabilities } = useCapabilities();
  
  let shouldShow = true;
  
  if (capability) {
    shouldShow = hasCapability(capability);
  } else if (anyOf) {
    shouldShow = hasAnyCapability(anyOf);
  } else if (allOf) {
    shouldShow = hasAllCapabilities(allOf);
  }
  
  if (shouldShow) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
}

/**
 * Hook for document-specific capabilities
 */
export function useDocumentCapabilities() {
  const capabilities = useCapabilities();
  
  return {
    canView: capabilities.canViewDocuments,
    canEdit: capabilities.canEditDocuments,
    canCreate: capabilities.canCreateDocuments,
    canDelete: capabilities.canDeleteDocuments,
    canDownload: capabilities.canDownloadDocuments,
    canComment: capabilities.canCommentDocuments,
    canApprove: capabilities.canApproveDocuments,
    canManage: capabilities.canManageDocuments,
    
    // Combined checks
    canModify: capabilities.canEditDocuments || capabilities.canManageDocuments,
    canRemove: capabilities.canDeleteDocuments || capabilities.canManageDocuments,
    hasAnyDocumentAccess: capabilities.canViewDocuments,
    hasFullDocumentAccess: capabilities.canManageDocuments,
  };
}

/**
 * Hook for user/admin capabilities
 */
export function useAdminCapabilities() {
  const capabilities = useCapabilities();
  
  return {
    canViewUsers: capabilities.canViewUsers,
    canManageUsers: capabilities.canManageUsers,
    canDeleteUsers: capabilities.canDeleteUsers,
    canViewRoles: capabilities.canViewRoles,
    canManageRoles: capabilities.canManageRoles,
    
    // Combined checks
    canAccessAdmin: capabilities.showAdminNav,
    hasUserPermissions: capabilities.canViewUsers || capabilities.canManageUsers,
    hasRolePermissions: capabilities.canViewRoles || capabilities.canManageRoles,
    isFullAdmin: capabilities.isAdmin,
  };
}
