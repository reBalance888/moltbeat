#!/bin/bash

###############################################################################
# Setup Automated Backups with Cron
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"

log() {
    echo -e "\033[0;32m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

error() {
    echo -e "\033[0;31m[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:\033[0m $1"
    exit 1
}

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    error "Backup script not found: $BACKUP_SCRIPT"
fi

# Make scripts executable
log "Making scripts executable..."
chmod +x "$BACKUP_SCRIPT"
chmod +x "${SCRIPT_DIR}/restore.sh"

# Create environment file
ENV_FILE="${SCRIPT_DIR}/.backup-env"

log "Creating environment file: $ENV_FILE"

cat > "$ENV_FILE" << 'EOF'
# MoltBeat Backup Configuration

# Database URL (required)
DATABASE_URL=postgresql://user:password@host:5432/moltbeat

# Backup directory
BACKUP_DIR=/var/backups/moltbeat

# S3 bucket (optional)
S3_BUCKET=my-bucket

# Retention days
RETENTION_DAYS=30

# Webhook for notifications (optional)
WEBHOOK_URL=
EOF

log "Environment file created. Please edit: $ENV_FILE"

# Create cron job
CRON_FILE="/tmp/moltbeat-backup-cron"

cat > "$CRON_FILE" << EOF
# MoltBeat Automated Backups

# Daily backup at 2:00 AM
0 2 * * * . ${ENV_FILE} && ${BACKUP_SCRIPT} >> /var/log/moltbeat-backup.log 2>&1

# Weekly full backup on Sunday at 3:00 AM
0 3 * * 0 . ${ENV_FILE} && ${BACKUP_SCRIPT} >> /var/log/moltbeat-backup.log 2>&1
EOF

log "Cron jobs configured:"
cat "$CRON_FILE"

echo ""
echo "To install cron jobs, run:"
echo "  crontab $CRON_FILE"
echo ""
echo "Or manually add to crontab:"
echo "  crontab -e"
echo ""

log "Setup completed!"
log "Next steps:"
log "1. Edit environment file: $ENV_FILE"
log "2. Install cron jobs: crontab $CRON_FILE"
log "3. Test backup: $BACKUP_SCRIPT"
