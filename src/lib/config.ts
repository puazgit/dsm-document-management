/**
 * Application Configuration
 */

// Environment variables validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXTAUTH_SECRET',
] as const;

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'Document Management System',
    version: process.env.APP_VERSION || '1.0.0',
    url: process.env.APP_URL || 'http://localhost:3000',
    env: process.env.NODE_ENV || 'development',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL,
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET!,
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400'), // 24 hours
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
  },

  // File Upload
  upload: {
    path: process.env.UPLOAD_PATH || './public/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800'), // 50MB
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif').split(','),
    thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '300'),
  },

  // Email
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.FROM_EMAIL || 'noreply@dsm.com',
    templatePath: process.env.EMAIL_TEMPLATE_PATH || './src/templates/emails',
    mockEmail: process.env.MOCK_EMAIL === 'true',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1 hour
  },

  // WebSocket
  websocket: {
    port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
    path: process.env.WEBSOCKET_PATH || '/socket.io',
    enabled: process.env.ENABLE_WEBSOCKET !== 'false',
  },

  // API
  api: {
    rateLimit: parseInt(process.env.API_RATE_LIMIT || '100'), // requests per minute
    rateWindow: parseInt(process.env.API_RATE_WINDOW || '60'), // window in seconds
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  },

  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20'),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100'),
  },

  // Security
  security: {
    contentSecurityPolicy: process.env.CONTENT_SECURITY_POLICY || "default-src 'self'",
    xFrameOptions: process.env.X_FRAME_OPTIONS || 'DENY',
    xContentTypeOptions: process.env.X_CONTENT_TYPE_OPTIONS || 'nosniff',
    encryptionKey: process.env.ENCRYPTION_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING === 'true',
  },

  // Backup
  backup: {
    path: process.env.BACKUP_PATH || './backups',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  },

  // Document Settings
  documents: {
    retentionDays: parseInt(process.env.DOCUMENT_RETENTION_DAYS || '365'),
    autoArchiveEnabled: process.env.AUTO_ARCHIVE_ENABLED === 'true',
    watermarkText: process.env.WATERMARK_TEXT || 'CONFIDENTIAL',
    enableVersioning: process.env.ENABLE_DOCUMENT_VERSIONING !== 'false',
  },

  // Notifications
  notifications: {
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE || '50'),
    cleanupDays: parseInt(process.env.NOTIFICATION_CLEANUP_DAYS || '30'),
    emailEnabled: process.env.EMAIL_NOTIFICATION_ENABLED !== 'false',
    inAppEnabled: process.env.IN_APP_NOTIFICATION_ENABLED !== 'false',
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@dsm.com',
    maintenanceEmail: process.env.SYSTEM_MAINTENANCE_EMAIL || 'maintenance@dsm.com',
    enableRegistration: process.env.ENABLE_REGISTRATION === 'true',
    defaultUserGroup: process.env.DEFAULT_USER_GROUP || 'members',
  },

  // Development
  development: {
    debugMode: process.env.DEBUG_MODE === 'true',
    enablePrismaLogging: process.env.ENABLE_PRISMA_LOGGING === 'true',
    showQueryLogs: process.env.SHOW_QUERY_LOGS === 'true',
  },

  // Feature Flags
  features: {
    enableComments: true,
    enableNotifications: true,
    enableVersioning: true,
    enableApprovalWorkflow: true,
    enableAuditLogs: true,
    enableFilePreview: true,
    enableBulkOperations: true,
    enableAdvancedSearch: true,
  },
} as const;

/**
 * Runtime configuration that can be updated
 */
export interface RuntimeConfig {
  maintenanceMode: boolean;
  maxConcurrentUploads: number;
  enableNewRegistrations: boolean;
  systemMessage?: string;
  // Add more runtime configs as needed
}

let runtimeConfig: RuntimeConfig = {
  maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  maxConcurrentUploads: 5,
  enableNewRegistrations: config.admin.enableRegistration,
};

export function getRuntimeConfig(): RuntimeConfig {
  return { ...runtimeConfig };
}

export function updateRuntimeConfig(updates: Partial<RuntimeConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...updates };
}

/**
 * Get configuration value by path
 */
export function getConfigValue<T = any>(path: string, defaultValue?: T): T {
  const keys = path.split('.');
  let value: any = config;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue as T;
    }
  }
  
  return value as T;
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

/**
 * Validate configuration on startup
 */
export function validateConfig(): void {
  // Check file upload path
  if (!config.upload.path) {
    throw new Error('Upload path is not configured');
  }

  // Check JWT secrets
  if (config.auth.jwtSecret.length < 32) {
    console.warn('JWT secret should be at least 32 characters long');
  }

  // Check SMTP configuration if email is enabled
  if (config.notifications.emailEnabled && !config.email.mockEmail) {
    if (!config.email.smtp.user || !config.email.smtp.pass) {
      console.warn('SMTP credentials not configured. Email notifications may not work.');
    }
  }

  // Validate pagination limits
  if (config.pagination.maxPageSize > 1000) {
    console.warn('Max page size is very high. This may impact performance.');
  }

  console.log('✅ Configuration validation completed');
}

// Validate configuration on module load
validateConfig();