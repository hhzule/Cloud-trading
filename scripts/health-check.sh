
#!/bin/bash

# Check health of all services

set -e

ENVIRONMENT=${1:-dev}
NAMESPACE="cloudtrade-$ENVIRONMENT"

echo "🏥 Health Check - $ENVIRONMENT"
echo "=============================="

# Check pods
echo ""
echo "Pod Status:"
kubectl get pods -n $NAMESPACE

# Check deployments
echo ""
echo "Deployment Status:"
kubectl get deployments -n $NAMESPACE

# Test endpoints
echo ""
echo "Endpoint Tests:"

FRONTEND_POD=$(kubectl get pod -n $NAMESPACE -l app=frontend -o jsonpath='{.items[0].metadata.name}')
API_POD=$(kubectl get pod -n $NAMESPACE -l app=trading-api -o jsonpath='{.items[0].metadata.name}')
MARKET_POD=$(kubectl get pod -n $NAMESPACE -l app=market-data -o jsonpath='{.items[0].metadata.name}')

echo -n "Frontend health: "
kubectl exec -n $NAMESPACE $FRONTEND_POD -- wget -q -O- http://localhost:3000/ > /dev/null && echo "✅" || echo "❌"

echo -n "Trading API health: "
kubectl exec -n $NAMESPACE $API_POD -- wget -q -O- http://localhost:3000/health > /dev/null && echo "✅" || echo "❌"

echo -n "Market Data health: "
kubectl exec -n $NAMESPACE $MARKET_POD -- wget -q -O- http://localhost:8000/health > /dev/null && echo "✅" || echo "❌"

# Check resource usage
echo ""
echo "Resource Usage:"
kubectl top pods -n $NAMESPACE

echo ""
echo "✅ Health check complete"