# Build and test locally
docker build -t trading-api apps/trading-api
docker run -p 3000:3000 trading-api

# Deploy with kubectl
kubectl apply -k kubernetes/overlays/dev
kubectl get pods -n cloudtrade-dev
kubectl logs -f deployment/trading-api -n cloudtrade-dev

# Terraform operations
terraform init
terraform plan
terraform apply
terraform destroy

# ArgoCD operations
argocd app list
argocd app sync trading-api-dev
argocd app get trading-api-dev

# Monitoring
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090