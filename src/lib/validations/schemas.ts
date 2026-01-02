import { z } from 'zod';

/**
 * Authentication Validation Schemas
 */
export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, 'Email or username is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  groupId: z.string().cuid('Invalid group ID'),
  divisiId: z.string().cuid('Invalid division ID').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * User Validation Schemas
 */
export const userCreateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters'),
  groupId: z.string().cuid('Invalid group ID'),
  divisiId: z.string().cuid('Invalid division ID').optional(),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
  firstName: z
    .string()
    .max(100, 'First name must not exceed 100 characters')
    .optional(),
  lastName: z
    .string()
    .max(100, 'Last name must not exceed 100 characters')
    .optional(),
  groupId: z.string().cuid('Invalid group ID').optional(),
  divisiId: z.string().cuid('Invalid division ID').optional(),
  isActive: z.boolean().optional(),
});

/**
 * Document Validation Schemas
 */
export const documentUploadSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must not exceed 500 characters'),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  documentTypeId: z.string().cuid('Invalid document type ID'),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  accessGroups: z.array(z.string()).optional(),
  expiresAt: z.date().optional(),
});

export const documentUpdateSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must not exceed 500 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must not exceed 2000 characters')
    .optional(),
  documentTypeId: z.string().cuid('Invalid document type ID').optional(),
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  accessGroups: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  expiresAt: z.date().optional(),
});

export const documentApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comments: z.string().max(1000, 'Comments must not exceed 1000 characters').optional(),
});

/**
 * Comment Validation Schemas
 */
export const commentCreateSchema = z.object({
  documentId: z.string().cuid('Invalid document ID'),
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must not exceed 2000 characters'),
  parentId: z.string().cuid('Invalid parent comment ID').optional(),
});

export const commentUpdateSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment must not exceed 2000 characters'),
});

/**
 * Search and Filter Schemas
 */
export const documentSearchSchema = z.object({
  query: z.string().max(200, 'Search query too long').optional(),
  type: z.string().cuid('Invalid document type').optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED', 'ARCHIVED', 'EXPIRED']).optional(),
  createdBy: z.string().cuid('Invalid user ID').optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'status', 'type']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * System Configuration Schemas
 */
export const systemConfigSchema = z.object({
  key: z.string().min(1, 'Configuration key is required'),
  value: z.string(),
  dataType: z.enum(['string', 'number', 'boolean', 'json']),
  category: z.string().optional(),
  description: z.string().optional(),
  isEditable: z.boolean().default(true),
});

/**
 * File Upload Validation
 */
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Please select a file' }),
}).refine((data) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                       'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                       'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                       'image/jpeg', 'image/png', 'image/gif'];
  return allowedTypes.includes(data.file.type);
}, {
  message: 'File type not allowed. Please upload PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, or GIF files.',
  path: ['file'],
}).refine((data) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  return data.file.size <= maxSize;
}, {
  message: 'File size must be less than 50MB.',
  path: ['file'],
});

/**
 * Type definitions for validation schemas
 */
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type UserCreateFormData = z.infer<typeof userCreateSchema>;
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
export type DocumentUpdateFormData = z.infer<typeof documentUpdateSchema>;
export type DocumentApprovalFormData = z.infer<typeof documentApprovalSchema>;
export type CommentCreateFormData = z.infer<typeof commentCreateSchema>;
export type CommentUpdateFormData = z.infer<typeof commentUpdateSchema>;
export type DocumentSearchParams = z.infer<typeof documentSearchSchema>;
export type SystemConfigFormData = z.infer<typeof systemConfigSchema>;
export type FileUploadFormData = z.infer<typeof fileUploadSchema>;