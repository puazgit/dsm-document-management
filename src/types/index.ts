// Prisma types will be imported when needed
// Using type definitions that match our Prisma schema

/**
 * Base Prisma model types
 */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  groupId?: string | null;
  divisiId?: string | null;
}

export interface Group {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  permissions?: any;
  isActive?: boolean;
  createdAt: Date;
}

export interface Document {
  id: string;
  title: string;
  description?: string | null;
  fileName: string;
  filePath: string;
  fileSize?: number | null;
  fileType?: string | null;
  mimeType?: string | null;
  version: string;
  status: DocumentStatus;
  accessGroups: string[];
  downloadCount: number;
  viewCount: number;
  tags: string[];
  metadata?: any;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  documentTypeId: string;
  createdById: string;
  updatedById?: string | null;
  approvedById?: string | null;
  approvedAt?: Date | null;
}

export interface DocumentType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  accessLevel: number;
  requiredApproval: boolean;
  retentionPeriod?: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  documentId: string;
  parentId?: string | null;
  userId: string;
  content: string;
  isEdited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message?: string | null;
  type: NotificationType;
  data?: any;
  isRead: boolean;
  readAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
}

export interface Divisi {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  parentId?: string | null;
  headId?: string | null;
}

/**
 * Extended types with relations
 */
export type UserWithRelations = User & {
  group?: Group | null;
  divisi?: Divisi | null;
  documentsCreated?: Document[];
  documentsUpdated?: Document[];
  documentsApproved?: Document[];
  comments?: Comment[];
  notifications?: Notification[];
};

export type DocumentWithRelations = Document & {
  documentType: DocumentType;
  createdBy: User;
  updatedBy?: User | null;
  approvedBy?: User | null;
  comments?: CommentWithRelations[];
  activities?: DocumentActivity[];
  versions?: DocumentVersion[];
};

export type CommentWithRelations = Comment & {
  user: User;
  document: Document;
  parent?: Comment | null;
  replies?: Comment[];
};

export type NotificationWithRelations = Notification & {
  user: User;
};

export type GroupWithUsers = Group & {
  users: User[];
};

export type DivisiWithRelations = Divisi & {
  users: User[];
  head?: User | null;
  parent?: Divisi | null;
  children: Divisi[];
};

/**
 * Auth related types
 */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  groupId?: string | null;
  group?: Group | null;
  divisiId?: string | null;
  divisi?: Divisi | null;
  isActive: boolean;
  lastLogin?: Date | null;
  createdAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  groupId: string;
  divisiId?: string;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    path?: string;
  };
}

/**
 * Document related types
 */
export interface DocumentUploadData {
  title: string;
  description?: string;
  file: File;
  documentTypeId: string;
  tags?: string[];
  accessGroups?: string[];
  expiresAt?: Date;
}

export interface DocumentFilter {
  query?: string;
  type?: string;
  status?: DocumentStatus;
  createdBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentStats {
  totalDocuments: number;
  documentsByType: { type: string; count: number }[];
  documentsByStatus: { status: string; count: number }[];
  recentDocuments: Document[];
  pendingApprovals: number;
  documentsThisMonth: number;
  totalDownloads: number;
}

export interface DocumentActivity {
  id: string;
  documentId: string;
  userId: string;
  action: ActivityAction;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
  user: User;
  document: Document;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  changes?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  previousVersion?: string;
  createdById: string;
  createdAt: Date;
  createdBy: User;
}

/**
 * Enums
 */
export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
}

export enum NotificationType {
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
  DOCUMENT_PUBLISHED = 'DOCUMENT_PUBLISHED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COMMENT_REPLIED = 'COMMENT_REPLIED',
  DOCUMENT_EXPIRED = 'DOCUMENT_EXPIRED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
  USER_MENTIONED = 'USER_MENTIONED',
}

export enum ActivityAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PUBLISH = 'PUBLISH',
  COMMENT = 'COMMENT',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

/**
 * User Permissions
 */
export interface UserPermissions {
  documents: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    approve: boolean;
    publish: boolean;
  };
  users: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
  admin: {
    access: boolean;
    systemConfig: boolean;
  };
}

/**
 * Dashboard types
 */
export interface DashboardData {
  stats: DocumentStats;
  recentActivities: DocumentActivity[];
  pendingApprovals: DocumentWithRelations[];
  notifications: NotificationWithRelations[];
  quickActions: QuickAction[];
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  permission?: string;
}

/**
 * Search types
 */
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'user' | 'comment';
  url: string;
  metadata?: Record<string, any>;
  score?: number;
}

export interface SearchFilters {
  types?: ('document' | 'user' | 'comment')[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  authors?: string[];
  tags?: string[];
}

/**
 * Form types
 */
export interface FormState {
  isLoading: boolean;
  errors: Record<string, string>;
  success: boolean;
  message?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

/**
 * File types
 */
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Theme types
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Navigation types
 */
export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  badge?: number;
  children?: NavItem[];
  permission?: string;
}

/**
 * Component Props types
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface PageProps {
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
}

/**
 * Utility types
 */
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Environment variables interface
 */
export interface EnvironmentVariables {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NEXTAUTH_SECRET: string;
  NEXTAUTH_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Next.js specific types
 */
export interface NextPageProps<T = {}> {
  params: T;
  searchParams: { [key: string]: string | string[] | undefined };
}

/**
 * WebSocket types
 */
export interface WebSocketMessage {
  type: 'notification' | 'comment' | 'document_update' | 'user_activity';
  payload: any;
  timestamp: string;
  userId?: string;
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId: string;
}

/**
 * Audit log types
 */
export interface AuditLog {
  id: string;
  userId?: string;
  action: ActivityAction;
  entity: string;
  entityId?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
  createdAt: Date;
  user?: User;
}