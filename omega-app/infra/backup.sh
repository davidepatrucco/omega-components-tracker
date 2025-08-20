#!/usr/bin/env bash
#set -e
# Backup helper for the Lightsail deployment
# - Dumps MongoDB (if available) to ./backups
# - Archives named volumes (if applicable)

BACKUP_DIR="/var/backups/omega-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Backing up MongoDB (if available)..."
if command -v mongodump >/dev/null 2>&1; then
  # expects MONGO_URI env var configured on the server
  mongodump --uri "$MONGO_URI" --archive="$BACKUP_DIR/mongo.archive" --gzip || echo "mongodump failed or MONGO_URI not set"
else
  echo "mongodump not found, skipping MongoDB dump"
fi

# If you use named Docker volumes you can tar them (example for 'letsencrypt')
VOLUMES=(letsencrypt)
for v in "${VOLUMES[@]}"; do
  echo "Saving volume $v..."
  docker run --rm -v ${v}:/volume -v "$BACKUP_DIR":/backup alpine sh -c "cd /volume && tar czf /backup/${v}.tgz ." || echo "Failed to backup volume $v"
done

echo "Backup completed: $BACKUP_DIR"
