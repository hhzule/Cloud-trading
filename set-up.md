# Run Trading API

cd apps/trading-api
npm init -y
npm install express cors helmet redis pg prom-client

## Test locally
docker build -t trading-api:test .
docker run -p 3000:3000 trading-api:test

<!-- with env vars -->
<!-- docker run -p 3000:3000 \
  -e DB_HOST=localhost \
  -e DB_PASSWORD=secret \
  -e REDIS_HOST=localhost \
  trading-api:test  -->

## Test with redis and postgress
docker compose up

## Verify endpoints

curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/metrics

docker compose logs api

# Run Market Data Service

cd apps/market-data-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

## Test locally
uvicorn app.main:app --reload

## Run tests
pytest tests/ -v

## Build Docker image
docker build -t market-data:test .
docker run -p 8000:8000 market-data:test


# Kubernetes Manifests (Base)
cd kubernetes/base

## Test with minikube/kind
kind create cluster --name test
kubectl apply -k .

## Verify
kubectl get pods
kubectl get svc

# Frontend
cd apps/frontend

# Test locally
npm run dev
# Open http://localhost:3009

# Build Docker image
docker build -t frontend:test .

# GitHub Actions CI/CD

## Set up GitHub secrets:
gh secret set GITHUB_TOKEN
gh secret set GITOPS_TOKEN

# Terraform Infrastructure

## Initialize
terraform init

## Create S3 backend (one-time)
aws s3api create-bucket --bucket cloudtrade-terraform-state --region us-east-1
aws dynamodb create-table --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

## Plan and apply
terraform plan -out=tfplan
terraform apply tfplan

## Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name cloudtrade-dev

# Prometheus & Grafana

## Run the monitoring setup script
./scripts/setup-monitoring.sh

## Or install manually:
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values kubernetes/monitoring/prometheus/values.yaml

## Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
## Open http://localhost:3000
## Default: admin / prom-operator

## Import dashboards
## - Kubernetes Cluster (ID: 7249)
## - Node Exporter (ID: 1860)
## - Application custom dashboards


# ArgoCD GitOps

## Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Get initial password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

## Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

## Login via CLI
argocd login localhost:8080

## Create applications
kubectl apply -f gitops/argocd/app-of-apps.yaml

## Verify sync
argocd app list
argocd app sync cloudtrade-apps





