
#!/bin/bash

# Rollback deployment

set -e

ENVIRONMENT=${1:-dev}
DEPLOYMENT=${2}

if [[ -z "$DEPLOYMENT" ]]; then
    echo "Usage: ./scripts/rollback.sh <environment> <deployment>"
    echo "Example: ./scripts/rollback.sh dev frontend"
    exit 1
fi

echo "🔄 Rolling back $DEPLOYMENT in $ENVIRONMENT"

kubectl rollout undo deployment/$DEPLOYMENT -n cloudtrade-$ENVIRONMENT

echo "⏳ Waiting for rollback..."
kubectl rollout status deployment/$DEPLOYMENT -n cloudtrade-$ENVIRONMENT

echo "✅ Rollback complete"

# Show current status
kubectl get pods -n cloudtrade-$ENVIRONMENT -l app=$DEPLOYMENT
