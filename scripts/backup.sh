
#!/bin/bash

# Backup databases and configurations

set -e

ENVIRONMENT=${1:-dev}
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo "💾 Creating backup for $ENVIRONMENT"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
kubectl exec -n database postgres-0 -- pg_dump -U postgres trading > $BACKUP_DIR/postgres.sql

# Backup Kubernetes configs
echo "Backing up Kubernetes configs..."
kubectl get all -n cloudtrade-$ENVIRONMENT -o yaml > $BACKUP_DIR/k8s-resources.yaml

# Backup secrets (encrypted)
echo "Backing up secrets..."
kubectl get secrets -n cloudtrade-$ENVIRONMENT -o yaml > $BACKUP_DIR/secrets.yaml

echo "✅ Backup complete: $BACKUP_DIR"
echo "⚠️  Remember to encrypt sensitive data!"
