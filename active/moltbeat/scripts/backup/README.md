# MoltBeat Backup & Restore

Automated database backup and disaster recovery for MoltBeat.

## Quick Start

### Setup

```bash
# 1. Make scripts executable
chmod +x backup.sh restore.sh setup-cron.sh

# 2. Configure environment
cp .backup-env.example .backup-env
nano .backup-env

# 3. Test backup
./backup.sh

# 4. Setup automated backups
./setup-cron.sh
crontab /tmp/moltbeat-backup-cron
```

### Manual Backup

```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/moltbeat"
export BACKUP_DIR="/var/backups/moltbeat"
export S3_BUCKET="my-backup-bucket"
export RETENTION_DAYS=30

./backup.sh
```

### Restore

```bash
# List backups
./restore.sh list

# Test restore (dry run)
./restore.sh test /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz

# Restore database
./restore.sh restore /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz

# Restore from S3
./restore.sh restore-s3 moltbeat_backup_20260131_120000.sql.gz
```

## Features

- **Automated backups** - Daily cron jobs
- **S3 upload** - Off-site backup storage
- **Backup rotation** - Automatic cleanup based on retention
- **Integrity verification** - Automatic backup validation
- **Restore testing** - Dry run restore to temp database
- **Notifications** - Webhook alerts on success/failure

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/moltbeat

# Optional
BACKUP_DIR=/var/backups/moltbeat    # Default backup location
S3_BUCKET=my-bucket                 # S3 bucket for off-site backups
RETENTION_DAYS=30                   # Days to keep backups
WEBHOOK_URL=https://...             # Notification webhook
```

### Cron Schedule

```cron
# Daily backup at 2 AM
0 2 * * * . /path/to/.backup-env && /path/to/backup.sh >> /var/log/moltbeat-backup.log 2>&1

# Weekly full backup on Sunday at 3 AM
0 3 * * 0 . /path/to/.backup-env && /path/to/backup.sh >> /var/log/moltbeat-backup.log 2>&1
```

## S3 Setup

### Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://moltbeat-backups

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket moltbeat-backups \
  --versioning-configuration Status=Enabled

# Enable lifecycle policy (30 day retention)
cat > lifecycle.json << 'EOF'
{
  "Rules": [{
    "Id": "DeleteOldBackups",
    "Status": "Enabled",
    "ExpirationInDays": 30,
    "Prefix": "backups/"
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket moltbeat-backups \
  --lifecycle-configuration file://lifecycle.json
```

### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::moltbeat-backups/*",
        "arn:aws:s3:::moltbeat-backups"
      ]
    }
  ]
}
```

## Monitoring

### Check Backup Status

```bash
# View recent backups
ls -lh /var/backups/moltbeat/

# Check backup log
tail -f /var/log/moltbeat-backup.log

# S3 backups
aws s3 ls s3://moltbeat-backups/backups/ --recursive
```

### Alerts

Set up alerts for:
- Backup failure
- S3 upload failure
- Backup size anomaly
- Verification failure

### Metrics

Track in monitoring system:
- Backup duration
- Backup size
- Success rate
- Last successful backup time

## Testing

### Test Backup

```bash
# Create backup
./backup.sh

# Verify integrity
gzip -t /var/backups/moltbeat/moltbeat_backup_*.sql.gz

# Test restore
./restore.sh test /var/backups/moltbeat/moltbeat_backup_*.sql.gz
```

### Disaster Recovery Drill

```bash
# 1. Stop application
systemctl stop moltbeat-api

# 2. Drop database
dropdb moltbeat

# 3. Recreate database
createdb moltbeat

# 4. Restore
./restore.sh restore /var/backups/moltbeat/latest.sql.gz

# 5. Restart application
systemctl start moltbeat-api

# 6. Verify
curl http://localhost:3000/health
```

## Troubleshooting

### Backup fails

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h /var/backups/moltbeat

# Check permissions
ls -ld /var/backups/moltbeat
```

### S3 upload fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check bucket access
aws s3 ls s3://moltbeat-backups/

# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://moltbeat-backups/test.txt
```

### Restore fails

```bash
# Check backup integrity
gzip -t backup.sql.gz

# Check database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database permissions
psql $DATABASE_URL -c "SHOW is_superuser;"
```

## Best Practices

1. **Test regularly** - Monthly disaster recovery drills
2. **Monitor backups** - Set up alerts for failures
3. **Multiple locations** - Local + S3 + cross-region
4. **Verify integrity** - Always verify after backup
5. **Document procedures** - Keep DR plan updated
6. **Encrypt backups** - Use GPG for sensitive data
7. **Track metrics** - Monitor backup size and duration

## Security

### Encryption

```bash
# Encrypt backup
gpg --encrypt --recipient your-key backup.sql.gz

# Decrypt
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

### Access Control

```bash
# Secure backup directory
chmod 700 /var/backups/moltbeat

# Secure scripts
chmod 700 backup.sh restore.sh

# Secure environment file
chmod 600 .backup-env
```

## License

MIT
