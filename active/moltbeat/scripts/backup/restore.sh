#!/bin/bash

###############################################################################
# MoltBeat Database Restore Script
# Restore database from backup file
###############################################################################

set -e
set -u

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/moltbeat}"
DATABASE_URL="${DATABASE_URL:-}"
S3_BUCKET="${S3_BUCKET:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

###############################################################################
# Functions
###############################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# List available backups
list_backups() {
    log "=== Available Backups ==="

    if [ ! -d "$BACKUP_DIR" ]; then
        warn "Backup directory not found: $BACKUP_DIR"
        return
    fi

    local backups=$(find "$BACKUP_DIR" -name "moltbeat_backup_*.sql.gz" -type f | sort -r)

    if [ -z "$backups" ]; then
        warn "No local backups found"
    else
        echo "$backups" | nl -w2 -s'. '
    fi

    # List S3 backups
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "\n=== S3 Backups ==="
        aws s3 ls "s3://${S3_BUCKET}/backups/" | grep "moltbeat_backup_" || warn "No S3 backups found"
    fi
}

# Download backup from S3
download_from_s3() {
    local backup_file="$1"

    if [ -z "$S3_BUCKET" ]; then
        error "S3_BUCKET not set"
    fi

    log "Downloading from S3: ${backup_file}"

    local local_path="${BACKUP_DIR}/${backup_file}"

    aws s3 cp "s3://${S3_BUCKET}/backups/${backup_file}" "$local_path"

    if [ $? -eq 0 ]; then
        log "Downloaded to: ${local_path}"
        echo "$local_path"
    else
        error "Failed to download from S3"
    fi
}

# Restore database
restore_database() {
    local backup_file="$1"

    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi

    if [ -z "$DATABASE_URL" ]; then
        error "DATABASE_URL not set"
    fi

    log "Restoring database from: ${backup_file}"

    # Verify backup file
    if ! gzip -t "$backup_file" 2>/dev/null; then
        error "Backup file is corrupted"
    fi

    # Warning
    warn "This will OVERWRITE the current database!"
    echo -n "Are you sure you want to continue? (yes/no): "
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi

    # Drop existing connections
    log "Closing existing connections..."
    psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" || warn "Could not close connections"

    # Restore database
    log "Restoring database..."
    gunzip -c "$backup_file" | psql "$DATABASE_URL"

    if [ $? -eq 0 ]; then
        log "Database restored successfully"
    else
        error "Database restore failed"
    fi

    # Verify restore
    log "Verifying restore..."
    psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" &>/dev/null

    if [ $? -eq 0 ]; then
        log "Restore verification passed"
    else
        error "Restore verification failed"
    fi
}

# Test restore (restore to temporary database)
test_restore() {
    local backup_file="$1"

    log "Testing restore (dry run)..."

    # Create temporary database
    local temp_db="moltbeat_restore_test_$(date +%s)"
    local base_url=$(echo "$DATABASE_URL" | sed 's|/[^/]*$||')
    local temp_url="${base_url}/${temp_db}"

    log "Creating temporary database: ${temp_db}"
    createdb -h "$(echo "$DATABASE_URL" | grep -oP '(?<=@)[^/]+' | cut -d: -f1)" "$temp_db" || error "Failed to create temp database"

    # Restore to temp database
    gunzip -c "$backup_file" | psql "$temp_url" &>/dev/null

    if [ $? -eq 0 ]; then
        log "Test restore successful"

        # Show table count
        local table_count=$(psql "$temp_url" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
        log "Tables in backup: ${table_count}"
    else
        error "Test restore failed"
    fi

    # Drop temp database
    log "Cleaning up temporary database..."
    dropdb -h "$(echo "$DATABASE_URL" | grep -oP '(?<=@)[^/]+' | cut -d: -f1)" "$temp_db"

    log "Test restore completed"
}

###############################################################################
# Main
###############################################################################

usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    list                List available backups
    restore <file>      Restore from backup file
    restore-s3 <file>   Download from S3 and restore
    test <file>         Test restore (dry run)

Examples:
    $0 list
    $0 restore /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz
    $0 restore-s3 moltbeat_backup_20260131_120000.sql.gz
    $0 test /var/backups/moltbeat/moltbeat_backup_20260131_120000.sql.gz

Environment Variables:
    DATABASE_URL        PostgreSQL connection URL (required)
    BACKUP_DIR          Local backup directory (default: /var/backups/moltbeat)
    S3_BUCKET           S3 bucket name (optional)
EOF
    exit 1
}

main() {
    if [ $# -eq 0 ]; then
        usage
    fi

    local command="$1"
    shift

    case "$command" in
        list)
            list_backups
            ;;
        restore)
            if [ $# -ne 1 ]; then
                error "Usage: $0 restore <backup_file>"
            fi
            restore_database "$1"
            ;;
        restore-s3)
            if [ $# -ne 1 ]; then
                error "Usage: $0 restore-s3 <backup_file>"
            fi
            local downloaded=$(download_from_s3 "$1")
            restore_database "$downloaded"
            ;;
        test)
            if [ $# -ne 1 ]; then
                error "Usage: $0 test <backup_file>"
            fi
            test_restore "$1"
            ;;
        *)
            error "Unknown command: $command"
            usage
            ;;
    esac
}

main "$@"
