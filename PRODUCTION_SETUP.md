# Production Environment Setup Guide

## Overview
This guide provides step-by-step instructions for setting up the Document Security Management Tool (DSMT) in a production environment.

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 13+ database server
- Domain name and SSL certificate
- Production server (Linux recommended)

## 1. Environment Variables Configuration

### Required Production Environment Variables
Create a `.env.production` file with the following variables:

```bash
# ================================
# DATABASE CONFIGURATION
# ================================
DATABASE_URL="postgresql://username:password@your-db-host:5432/dsm_production?schema=public"
DIRECT_URL="postgresql://username:password@your-db-host:5432/dsm_production?schema=public"

# ================================
# AUTHENTICATION & SECURITY
# ================================
# Generate secure secrets using: openssl rand -base64 32
NEXTAUTH_SECRET="your-production-nextauth-secret-32-chars"
NEXTAUTH_URL="https://yourdomain.com"

JWT_SECRET="your-production-jwt-secret-32-chars"
JWT_EXPIRES_IN="7d"
REFRESH_TOKEN_SECRET="your-refresh-token-secret-32-chars"
REFRESH_TOKEN_EXPIRES_IN="30d"
ENCRYPTION_KEY="your-32-character-encryption-key"

# ================================
# APPLICATION SETTINGS
# ================================
NODE_ENV="production"
APP_NAME="Document Management System"
APP_URL="https://yourdomain.com"
APP_VERSION="1.0.0"

# ================================
# FILE STORAGE & UPLOAD
# ================================
UPLOAD_PATH="/var/www/dsmt/uploads"
MAX_FILE_SIZE="52428800"
ALLOWED_FILE_TYPES="pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif"

# ================================
# EMAIL CONFIGURATION
# ================================
SMTP_HOST="your-smtp-server.com"
SMTP_PORT="587"
SMTP_SECURE="true"
SMTP_USER="your-email@yourdomain.com"
SMTP_PASS="your-smtp-password"
FROM_EMAIL="DSMT System <noreply@yourdomain.com>"

# ================================
# SECURITY & LOGGING
# ================================
LOG_LEVEL="warn"
ENABLE_REQUEST_LOGGING="true"
DEBUG_MODE="false"
MOCK_EMAIL="false"
ENABLE_REGISTRATION="false"

# ================================
# ADMIN SETTINGS
# ================================
ADMIN_EMAIL="admin@yourdomain.com"
DEFAULT_USER_GROUP="members"
```

## 2. Database Setup

### 2.1 Create Production Database
```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE dsm_production;
CREATE USER dsm_user WITH ENCRYPTED PASSWORD 'secure-password';
GRANT ALL PRIVILEGES ON DATABASE dsm_production TO dsm_user;
```

### 2.2 Run Database Migrations
```bash
# Install dependencies
npm ci --production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed production data
npx prisma db seed
```

## 3. Application Build & Deployment

### 3.1 Build Application
```bash
# Build for production
npm run build

# Start production server
npm start
```

### 3.2 Process Manager (PM2 Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'dsmt-production',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/dsmt/error.log',
    out_file: '/var/log/dsmt/out.log',
    log_file: '/var/log/dsmt/combined.log'
  }]
}
EOF

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 4. Reverse Proxy Setup (Nginx)

### 4.1 Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File upload size
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /uploads {
        alias /var/www/dsmt/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 5. Security Considerations

### 5.1 File Permissions
```bash
# Set proper ownership
chown -R www-data:www-data /var/www/dsmt
chmod -R 755 /var/www/dsmt

# Secure upload directory
chmod 750 /var/www/dsmt/uploads
```

### 5.2 Firewall Configuration
```bash
# UFW (Ubuntu)
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 5.3 Database Security
- Use strong passwords
- Enable SSL for database connections
- Restrict database access to application server only
- Regular backups with encryption

## 6. Monitoring & Maintenance

### 6.1 Health Checks
```bash
# Add to crontab for health monitoring
*/5 * * * * curl -f https://yourdomain.com/api/health || systemctl restart dsmt
```

### 6.2 Log Rotation
```bash
# Create logrotate configuration
cat > /etc/logrotate.d/dsmt << EOF
/var/log/dsmt/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload dsmt-production
    endscript
}
EOF
```

### 6.3 Backup Strategy
```bash
# Database backup script
cat > /usr/local/bin/backup-dsmt.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/dsmt"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U dsm_user dsm_production | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/dsmt/uploads

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-dsmt.sh

# Add to crontab
echo "0 2 * * * /usr/local/bin/backup-dsmt.sh" | crontab -
```

## 7. Performance Optimization

### 7.1 Node.js Optimization
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

### 7.2 Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents (created_at DESC);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

## 8. Deployment Checklist

- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Firewall configured
- [ ] Application built and deployed
- [ ] PM2 process manager setup
- [ ] Nginx reverse proxy configured
- [ ] Health checks implemented
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Log rotation configured
- [ ] Security headers verified
- [ ] Performance testing completed

## 9. Troubleshooting

### Common Issues:
1. **Database connection issues**: Check DATABASE_URL and firewall rules
2. **File upload failures**: Verify upload directory permissions
3. **Authentication issues**: Verify NEXTAUTH_SECRET and JWT_SECRET
4. **SSL certificate errors**: Check certificate paths and expiration

### Debug Commands:
```bash
# Check application logs
pm2 logs dsmt-production

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test database connection
npx prisma db pull

# Check file permissions
ls -la /var/www/dsmt/uploads
```

## Support

For additional support or questions:
- Check application logs for detailed error messages
- Review Prisma and Next.js documentation
- Ensure all environment variables are properly set
- Verify database connectivity and permissions