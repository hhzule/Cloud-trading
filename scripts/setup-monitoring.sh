
#!/bin/bash

set -e

echo "Installing Prometheus Stack..."

# Add Helm repos
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Create namespace
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

# Install kube-prometheus-stack
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values kubernetes/monitoring/prometheus/values.yaml \
  --wait

# Install Loki
helm upgrade --install loki grafana/loki-stack \
  --namespace monitoring \
  --values kubernetes/monitoring/loki/values.yaml \
  --wait

echo "Monitoring stack installed successfully!"
echo ""
echo "Access Grafana:"
echo "kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo ""
echo "Default credentials:"
echo "Username: admin"
echo "Password: $(kubectl get secret -n monitoring prometheus-grafana -o jsonpath="{.data.admin-password}" | base64 --decode)"