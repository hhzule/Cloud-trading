#!/bin/bash

# Quick setup for local development with Kind/Minikube

set -e

echo "🚀 CloudTrade Platform - Local Setup"
echo "===================================="

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found"; exit 1; }
    command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not found"; exit 1; }
    command -v kind >/dev/null 2>&1 || { echo "❌ kind not found. Install from https://kind.sigs.k8s.io/"; exit 1; }
    command -v helm >/dev/null 2>&1 || { echo "❌ helm not found"; exit 1; }
    
    echo "✅ All prerequisites met"
}

# Create Kind cluster
create_cluster() {
    echo ""
    echo "🔧 Creating Kind cluster..."
    
    cat <<EOF | kind create cluster --name cloudtrade --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
- role: worker
EOF
    
    echo "✅ Cluster created"
}

# Build Docker images
build_images() {
    echo ""
    echo "🏗️  Building Docker images..."
    
    # Frontend
    echo "Building frontend..."
    docker build -t cloudtrade-frontend:latest apps/frontend
    kind load docker-image cloudtrade-frontend:latest --name cloudtrade
    
    # Trading API
    echo "Building trading API..."
    docker build -t trading-api:latest apps/trading-api
    kind load docker-image trading-api:latest --name cloudtrade
    
    # Market Data Service
    echo "Building market data service..."
    docker build -t market-data-service:latest apps/market-data-service
    kind load docker-image market-data-service:latest --name cloudtrade
    
    echo "✅ Images built and loaded"
}

# Install ingress controller
install_ingress() {
    echo ""
    echo "🌐 Installing NGINX Ingress Controller..."
    
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    echo "Waiting for ingress controller..."
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=90s
    
    echo "✅ Ingress controller ready"
}

# Deploy applications
deploy_apps() {
    echo ""
    echo "📦 Deploying applications..."
    
    # Create namespaces
    kubectl create namespace cloudtrade --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace cache --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace database --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy with Kustomize
    kubectl apply -k kubernetes/overlays/dev
    
    echo "Waiting for deployments..."
    kubectl wait --for=condition=available --timeout=300s \
      deployment/frontend deployment/trading-api deployment/market-data \
      -n cloudtrade
    
    echo "✅ Applications deployed"
}

# Install monitoring
install_monitoring() {
    echo ""
    read -p "Install monitoring stack (Prometheus/Grafana)? [y/N] " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📊 Installing monitoring..."
        ./scripts/setup-monitoring.sh
        echo "✅ Monitoring installed"
    fi
}

# Display access info
display_info() {
    echo ""
    echo "🎉 Setup complete!"
    echo "=================="
    echo ""
    echo "Access the applications:"
    echo "  Frontend:     http://localhost"
    echo "  Trading API:  http://localhost/api"
    echo "  Market Data:  http://localhost/market-data"
    echo ""
    echo "Useful commands:"
    echo "  kubectl get pods -n cloudtrade"
    echo "  kubectl logs -f deployment/frontend -n cloudtrade"
    echo "  kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring"
    echo ""
    echo "To tear down:"
    echo "  kind delete cluster --name cloudtrade"
}

# Main execution
main() {
    check_prerequisites
    create_cluster
    build_images
    install_ingress
    deploy_apps
    install_monitoring
    display_info
}

main
