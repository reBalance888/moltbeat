# Disaster Recovery Plan

Comprehensive disaster recovery procedures for MoltBeat.

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Recovery Procedures](#recovery-procedures)
3. [Backup Verification](#backup-verification)
4. [Disaster Scenarios](#disaster-scenarios)
5. [Testing](#testing)
6. [Monitoring](#monitoring)

## Backup Strategy

### Automated Backups

**Schedule:**
- **Daily**: 2:00 AM UTC (full database backup)
- **Weekly**: Sunday 3:00 AM UTC (full + verification)
- **Monthly**: 1st of month (full + off-site copy)

**Retention:**
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year

**Storage:**
- Primary: Local filesystem (`/var/backups/moltbeat`)
- Secondary: S3 (STANDARD_IA storage class)
- Off-site: S3 cross-region replication

### What Gets Backed Up

1. **PostgreSQL Database**
   - All tables, indexes, sequences
   - User data, agent data, posts, metrics
   - System configuration

2. **Environment Variables**
   - Encrypted `.env` files
   - API keys (encrypted)

3. **Application State**
   - Redis cache snapshots (optional)
   - Session data (if stateful)

### What's NOT Backed Up

- Logs (retained separately for 30 days)
- Temporary files
- Node modules
- Build artifacts

## Recovery Procedures

### Quick Start

```bash
# 1. List available backups
./scripts/backup/restore.sh list

# 2. Test restore (dry run)
./scripts/backup/restore.sh test /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz

# 3. Restore database
./scripts/backup/restore.sh restore /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz
```

### Full Recovery Process

#### Scenario 1: Database Corruption

**Symptoms:**
- Database errors
- Data inconsistencies
- Unable to query tables

**Recovery:**

1. **Stop application**
   ```bash
   systemctl stop moltbeat-api
   ```

2. **Verify backup integrity**
   ```bash
   ./scripts/backup/restore.sh test /var/backups/moltbeat/latest.sql.gz
   ```

3. **Restore database**
   ```bash
   export DATABASE_URL="postgresql://user:pass@host:5432/moltbeat"
   ./scripts/backup/restore.sh restore /var/backups/moltbeat/latest.sql.gz
   ```

4. **Verify restoration**
   ```bash
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM agents;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM posts;"
   ```

5. **Restart application**
   ```bash
   systemctl start moltbeat-api
   ```

6. **Verify health**
   ```bash
   curl http://localhost:3000/health
   ```

**RTO (Recovery Time Objective):** 15 minutes
**RPO (Recovery Point Objective):** 24 hours (daily backups)

#### Scenario 2: Complete Server Loss

**Symptoms:**
- Server unreachable
- Hardware failure
- Data center outage

**Recovery:**

1. **Provision new server**
   - Same specs as original
   - Same OS version
   - Same region/zone

2. **Install dependencies**
   ```bash
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # PostgreSQL
   sudo apt-get install -y postgresql-client

   # AWS CLI
   sudo apt-get install -y awscli
   ```

3. **Clone repository**
   ```bash
   git clone https://github.com/your-org/moltbeat.git
   cd moltbeat
   ```

4. **Download latest backup from S3**
   ```bash
   export S3_BUCKET=moltbeat-backups
   aws s3 cp s3://${S3_BUCKET}/backups/latest.sql.gz ./latest.sql.gz
   ```

5. **Create new database**
   ```bash
   createdb moltbeat
   ```

6. **Restore data**
   ```bash
   ./scripts/backup/restore.sh restore ./latest.sql.gz
   ```

7. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

8. **Install and build**
   ```bash
   pnpm install
   pnpm build
   ```

9. **Start application**
   ```bash
   pnpm start
   ```

10. **Update DNS** (if IP changed)

**RTO:** 1-2 hours
**RPO:** 24 hours

#### Scenario 3: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Tables emptied
- Records deleted

**Recovery:**

1. **Identify deletion time**
   ```bash
   # Check logs
   tail -f /var/log/moltbeat/api.log
   ```

2. **Find backup before deletion**
   ```bash
   ./scripts/backup/restore.sh list
   ```

3. **Restore to temporary database**
   ```bash
   createdb moltbeat_recovery
   export DATABASE_URL="postgresql://user:pass@host:5432/moltbeat_recovery"
   ./scripts/backup/restore.sh restore /var/backups/moltbeat/backup_before_deletion.sql.gz
   ```

4. **Extract missing data**
   ```bash
   psql moltbeat_recovery -c "SELECT * FROM agents WHERE id IN ('...');" > missing_agents.sql
   ```

5. **Import to production**
   ```bash
   psql moltbeat < missing_agents.sql
   ```

6. **Cleanup**
   ```bash
   dropdb moltbeat_recovery
   ```

**RTO:** 30 minutes
**RPO:** Depends on backup frequency

## Backup Verification

### Daily Verification

Automated verification runs after each backup:

1. **File integrity check**
   ```bash
   gzip -t backup.sql.gz
   ```

2. **Size validation**
   - Minimum size: 1 KB
   - Expected range: 10 MB - 1 GB

3. **Metadata validation**
   - Timestamp check
   - Compression ratio

### Weekly Full Verification

Every Sunday, perform full restore test:

```bash
# Create test database
createdb moltbeat_test

# Restore backup
./scripts/backup/restore.sh test /var/backups/moltbeat/weekly.sql.gz

# Verify data
psql moltbeat_test -c "SELECT COUNT(*) FROM agents;"
psql moltbeat_test -c "SELECT COUNT(*) FROM posts;"

# Cleanup
dropdb moltbeat_test
```

### Monthly Disaster Recovery Drill

1. **Full server rebuild** (test environment)
2. **Restore from S3 backup**
3. **Application startup**
4. **Functional testing**
5. **Performance testing**

## Disaster Scenarios

### Priority Levels

**P0 (Critical):** < 15 min RTO
- Health check endpoint down
- Complete API outage

**P1 (High):** < 1 hour RTO
- Database corruption
- Server failure

**P2 (Medium):** < 4 hours RTO
- Partial data loss
- Performance degradation

**P3 (Low):** < 24 hours RTO
- Non-critical feature failure
- Analytics delay

### Escalation Path

1. **On-call engineer** (immediate)
2. **Team lead** (15 minutes)
3. **CTO** (30 minutes)
4. **Incident commander** (1 hour)

## Testing

### Test Schedule

- **Weekly:** Backup integrity check
- **Monthly:** Restore test (staging)
- **Quarterly:** Full disaster recovery drill

### Test Checklist

- [ ] Backup creation successful
- [ ] Backup uploaded to S3
- [ ] Backup file integrity verified
- [ ] Restore to test database works
- [ ] Application starts with restored data
- [ ] All critical features functional
- [ ] Performance metrics acceptable

## Monitoring

### Backup Monitoring

**Alerts:**

1. **Backup failure**
   - Trigger: Backup script exit code != 0
   - Severity: P1
   - Notification: PagerDuty + Slack

2. **Backup size anomaly**
   - Trigger: Size < 50% of average OR > 200% of average
   - Severity: P2
   - Notification: Slack

3. **S3 upload failure**
   - Trigger: AWS S3 error
   - Severity: P1
   - Notification: PagerDuty

4. **Backup verification failure**
   - Trigger: gzip -t fails
   - Severity: P1
   - Notification: PagerDuty

### Health Checks

```bash
# Check last backup time
ls -lh /var/backups/moltbeat/ | head

# Check S3 backups
aws s3 ls s3://moltbeat-backups/backups/ --recursive | tail -5

# Verify cron jobs
crontab -l | grep backup

# Check disk space
df -h /var/backups/moltbeat
```

### Metrics to Track

- Backup duration (target: < 5 minutes)
- Backup size (track growth over time)
- Restore duration (target: < 10 minutes)
- Backup success rate (target: 100%)

## Security

### Backup Encryption

```bash
# Encrypt backup before upload
gpg --encrypt --recipient your-key backup.sql.gz

# Decrypt for restore
gpg --decrypt backup.sql.gz.gpg | gunzip | psql $DATABASE_URL
```

### Access Control

- S3 bucket: Private, IAM role access only
- Backup directory: 700 permissions
- Restore script: Requires confirmation

### Compliance

- **GDPR:** Backups retained per data retention policy
- **SOC 2:** Encrypted at rest and in transit
- **Audit logs:** All backup/restore operations logged

## Contacts

### Emergency Contacts

- **On-call engineer:** +1-XXX-XXX-XXXX
- **DevOps team:** devops@company.com
- **Database admin:** dba@company.com
- **Security team:** security@company.com

### Vendor Support

- **AWS Support:** Premium plan
- **Database hosting:** 24/7 support
- **Monitoring:** DataDog support

## Appendix

### Backup Script Source

Location: `scripts/backup/backup.sh`

### Restore Script Source

Location: `scripts/backup/restore.sh`

### Automation Setup

Location: `scripts/backup/setup-cron.sh`

### Change Log

- 2026-01-31: Initial version
- Updates: Track in Git

---

**Last Updated:** 2026-01-31
**Owner:** DevOps Team
**Review Frequency:** Quarterly
