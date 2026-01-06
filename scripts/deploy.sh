
#!/bin/bash

# Deploy to specific environment

set -e

ENVIRONMENT=${1:-dev}
DRY_RUN=${2:-false}

echo "🚀 Deploying to $ENVIRONMENT"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo "❌ Invalid environment. Use: dev, staging, or prod"
    exit 1
fi

# Check if on correct branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$ENVIRONMENT" == "prod" && "$CURRENT_BRANCH" != "main" ]]; then
    echo "❌ Production deploys must be from main branch"
    exit 1
fi

# Build and tag images
echo "📦 Building images..."
VERSION=$(git rev-parse --short HEAD)

docker build -t cloudtrade-frontend:$VERSION apps/frontend
docker build -t trading-api:$VERSION apps/trading-api
docker build -t market-data-service:$VERSION apps/market-data-service

# Push to registry
echo "📤 Pushing to registry..."
docker tag cloudtrade-frontend:$VERSION ghcr.io/your-org/cloudtrade-frontend:$VERSION
docker tag trading-api:$VERSION ghcr.io/your-org/trading-api:$VERSION
docker tag market-data-service:$VERSION ghcr.io/your-org/market-data-service:$VERSION

if [[ "$DRY_RUN" != "true" ]]; then
    docker push ghcr.io/your-org/cloudtrade-frontend:$VERSION
    docker push ghcr.io/your-org/trading-api:$VERSION
    docker push ghcr.io/your-org/market-data-service:$VERSION
fi

# Update Kustomize
echo "🔧 Updating Kustomize..."
cd kubernetes/overlays/$ENVIRONMENT
kustomize edit set image \
  frontend=ghcr.io/your-org/cloudtrade-frontend:$VERSION \
  trading-api=ghcr.io/your-org/trading-api:$VERSION \
  market-data-service=ghcr.io/your-org/market-data-service:$VERSION

# Apply to cluster
if [[ "$DRY_RUN" == "true" ]]; then
    echo "🔍 Dry run - showing what would be applied:"
    kubectl diff -k .
else
    echo "✅ Applying to cluster..."
    kubectl apply -k .
    
    # Wait for rollout
    echo "⏳ Waiting for rollout..."
    kubectl rollout status deployment/frontend -n cloudtrade-$ENVIRONMENT
    kubectl rollout status deployment/trading-api -n cloudtrade-$ENVIRONMENT
    kubectl rollout status deployment/market-data -n cloudtrade-$ENVIRONMENT
    
    echo "✅ Deployment complete!"
fi
