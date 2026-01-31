#!/bin/bash

###############################################################################
# MoltBeat Database Backup Script
# Automated PostgreSQL backup with S3 upload and rotation
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/moltbeat}"
DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="moltbeat_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

###############################################################################
# Functions
###############################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL environment variable not set"
    fi

    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Install PostgreSQL client tools."
    fi

    if [ -n "$S3_BUCKET" ] && ! command -v aws &> /dev/null; then
        warn "AWS CLI not found. Skipping S3 upload."
        S3_BUCKET=""
    fi

    log "Prerequisites OK"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Perform database backup
backup_database() {
    log "Starting database backup..."

    local backup_path="${BACKUP_DIR}/${BACKUP_FILE}"

    # Extract database connection details
    pg_dump "$DATABASE_URL" | gzip > "$backup_path"

    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_path" | cut -f1)
        log "Backup completed successfully: ${backup_path} (${size})"
    else
        error "Backup failed"
    fi

    echo "$backup_path"
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"

    log "Verifying backup integrity..."

    # Test gzip file
    if gzip -t "$backup_path" 2>/dev/null; then
        log "Backup file integrity verified"
    else
        error "Backup file is corrupted"
    fi

    # Check file size (should be > 1KB)
    local size=$(stat -f%z "$backup_path" 2>/dev/null || stat -c%s "$backup_path")
    if [ "$size" -lt 1024 ]; then
        error "Backup file too small (${size} bytes)"
    fi

    log "Backup verification passed"
}

# Upload to S3
upload_to_s3() {
    local backup_path="$1"

    if [ -z "$S3_BUCKET" ]; then
        log "S3 upload skipped (S3_BUCKET not set)"
        return 0
    fi

    log "Uploading to S3: s3://${S3_BUCKET}/${BACKUP_FILE}"

    aws s3 cp "$backup_path" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}" \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},retention=${RETENTION_DAYS}"

    if [ $? -eq 0 ]; then
        log "S3 upload completed"
    else
        warn "S3 upload failed (backup still available locally)"
    fi
}

# Rotate old backups
rotate_backups() {
    log "Rotating old backups (retention: ${RETENTION_DAYS} days)..."

    # Local rotation
    find "$BACKUP_DIR" -name "moltbeat_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    local deleted=$(find "$BACKUP_DIR" -name "moltbeat_backup_*.sql.gz" -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)

    if [ "$deleted" -gt 0 ]; then
        log "Deleted ${deleted} old local backups"
    fi

    # S3 rotation
    if [ -n "$S3_BUCKET" ]; then
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d 2>/dev/null || date -v-${RETENTION_DAYS}d +%Y%m%d)

        aws s3 ls "s3://${S3_BUCKET}/backups/" | grep "moltbeat_backup_" | while read -r line; do
            local file=$(echo "$line" | awk '{print $4}')
            local file_date=$(echo "$file" | grep -oE '[0-9]{8}')

            if [ "$file_date" -lt "$cutoff_date" ]; then
                log "Deleting old S3 backup: $file"
                aws s3 rm "s3://${S3_BUCKET}/backups/${file}"
            fi
        done
    fi

    log "Backup rotation completed"
}

# Send notification (optional)
send_notification() {
    local status="$1"
    local message="$2"

    # Webhook notification (e.g., Slack, Discord)
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"MoltBeat Backup ${status}: ${message}\"}" \
            &>/dev/null || true
    fi
}

###############################################################################
# Main
###############################################################################

main() {
    log "=== MoltBeat Database Backup Started ==="

    check_prerequisites
    create_backup_dir

    # Perform backup
    backup_path=$(backup_database)

    # Verify backup
    verify_backup "$backup_path"

    # Upload to S3
    upload_to_s3 "$backup_path"

    # Rotate old backups
    rotate_backups

    # Calculate metrics
    local total_backups=$(find "$BACKUP_DIR" -name "moltbeat_backup_*.sql.gz" | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" | cut -f1)

    log "=== Backup Summary ==="
    log "Latest backup: ${BACKUP_FILE}"
    log "Total backups: ${total_backups}"
    log "Total size: ${total_size}"
    log "=== Backup Completed Successfully ==="

    send_notification "SUCCESS" "Backup completed: ${BACKUP_FILE}"
}

# Run main function
main "$@"
