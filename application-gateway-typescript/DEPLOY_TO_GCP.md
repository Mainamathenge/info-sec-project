# Complete GCP Deployment Guide - With $300 Credits

Step-by-step guide to deploy your package management system on GCP and expose endpoints for frontend access.

---

## Prerequisites

```bash
# Install gcloud CLI (if not already installed)
# macOS:
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install

# Login with your school email
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

---

## Step 1: Create GCP Project

```bash
# List available projects (your school account should have created one)
gcloud projects list

# If you need to create a new project:
gcloud projects create package-mgmt-prod --name="Package Management"

# Set the project
export PROJECT_ID="package-mgmt-prod"  # Use your actual project ID
gcloud config set project $PROJECT_ID

# Enable billing (should already be enabled with your $300 credits)
# Verify in: https://console.cloud.google.com/billing
```

---

## Step 2: Enable Required APIs

```bash
# Enable all necessary APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable compute.googleapis.com
```

---

## Step 3: Create GKE Cluster

```bash
export REGION="us-central1"
export CLUSTER_NAME="fabric-cluster"

# Create cluster (optimized for $300 budget)
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --num-nodes=2 \
    --machine-type=e2-medium \
    --disk-size=20GB \
    --enable-autoscaling \
    --min-nodes=2 \
    --max-nodes=4 \
    --enable-autorepair \
    --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Verify cluster is running
kubectl get nodes
```

**Estimated Cost**: ~$60/month (well within your $300 budget)

---

## Step 4: Deploy Fabric Network

```bash
cd /Users/mac/Documents/cmu/fall-25/compiled/test-network-k8s

# Set environment for GKE
export TEST_NETWORK_CLUSTER_RUNTIME=gke

# Initialize cluster (creates namespace, storage, ingress)
./network cluster init

# Start Fabric network
./network up

# Create your channel
export CHANNEL_NAME=releasechannel
./network channel create

# Deploy your chaincode
./network chaincode deploy SoftwareReleaseContract \
    ../my-asset-chaincode-template

# Verify Fabric is running
kubectl get pods -n test-network
```

---

## Step 5: Set Up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create package-db \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=$REGION \
    --network=default

# Set postgres password
gcloud sql users set-password postgres \
    --instance=package-db \
    --password="YourSecurePassword123!"

# Create database
gcloud sql databases create package_management --instance=package-db

# Create application user
gcloud sql users create packageadmin \
    --instance=package-db \
    --password="AppPassword123!"

# Get connection name (save this!)
export SQL_CONNECTION=$(gcloud sql instances describe package-db --format="value(connectionName)")
echo "SQL Connection: $SQL_CONNECTION"
```

**Estimated Cost**: ~$7/month

---

## Step 6: Create Cloud Storage Bucket

```bash
# Create bucket for package files
gsutil mb -p $PROJECT_ID -l $REGION gs://${PROJECT_ID}-packages/

# Enable versioning
gsutil versioning set on gs://${PROJECT_ID}-packages/

# Make bucket accessible (set CORS for frontend)
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://${PROJECT_ID}-packages/
```

**Estimated Cost**: ~$0.50/month (for first 100GB)

---

## Step 7: Build and Push Docker Image

```bash
cd /Users/mac/Documents/cmu/fall-25/compiled/application-gateway-typescript

# Configure Docker for GCR
gcloud auth configure-docker

# Build image
docker build -t gcr.io/$PROJECT_ID/package-backend:v1 .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/package-backend:v1
```

---

## Step 8: Create Kubernetes Secrets

```bash
# Create backend namespace
kubectl create namespace backend

# Database credentials
kubectl create secret generic db-credentials \
    --namespace=backend \
    --from-literal=connection-name="$SQL_CONNECTION" \
    --from-literal=host="127.0.0.1" \
    --from-literal=port="5432" \
    --from-literal=user="packageadmin" \
    --from-literal=password="AppPassword123!" \
    --from-literal=database="package_management"

# JWT secret
kubectl create secret generic app-secrets \
    --namespace=backend \
    --from-literal=jwt-secret="$(openssl rand -base64 32)" \
    --from-literal=mailtrap-token="YOUR_MAILTRAP_TOKEN_HERE"

# Service account for Cloud SQL
gcloud iam service-accounts create backend-sa \
    --display-name="Backend Service Account"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:backend-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"
```

---

## Step 9: Deploy Backend Application

Create `backend-deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: package-backend
  namespace: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: package-backend
  template:
    metadata:
      labels:
        app: package-backend
    spec:
      containers:
      # Main application
      - name: backend
        image: gcr.io/PROJECT_ID/package-backend:v1  # Replace PROJECT_ID
        ports:
        - containerPort: 3000
          name: http
        env:
        # Server
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        
        # Database (via Cloud SQL Proxy sidecar)
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_PORT
          value: "5432"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: database
        
        # JWT & Auth
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: JWT_EXPIRES_IN
          value: "24h"
        
        # MFA
        - name: MFA_ISSUER
          value: "PackageManagement"
        - name: MFA_APP_NAME
          value: "Package Management System"
        
        # Mailtrap
        - name: MAILTRAP_TOKEN
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: mailtrap-token
        - name: MAILTRAP_SENDER_EMAIL
          value: "noreply@packagemanagement.com"
        - name: MAILTRAP_SENDER_NAME
          value: "Package Management"
        
        # Fabric Network (connects to test-network namespace)
        - name: CHANNEL_NAME
          value: "releasechannel"
        - name: CHAINCODE_NAME
          value: "SoftwareReleaseContract"
        - name: MSP_ID
          value: "Org1MSP"
        - name: PEER_ENDPOINT
          value: "org1-peer1.test-network.svc.cluster.local:7051"
        - name: PEER_HOST_ALIAS
          value: "org1-peer1"
        - name: CRYPTO_PATH
          value: "/fabric/crypto"
        
        # Admin
        - name: ADMIN_MSP_IDS
          value: "Org1MSP"
        
        # Storage
        - name: STORAGE_PATH
          value: "gs://PROJECT_ID-packages"  # Replace PROJECT_ID
        - name: MAX_FILE_SIZE
          value: "104857600"
        
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
        
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      
      # Cloud SQL Proxy sidecar
      - name: cloud-sql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:latest
        command:
          - "/cloud_sql_proxy"
          - "-instances=CONNECTION_NAME=tcp:5432"  # Replace CONNECTION_NAME
        securityContext:
          runAsNonRoot: true
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
---
# Service to expose the backend
apiVersion: v1
kind: Service
metadata:
  name: package-backend
  namespace: backend
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: package-backend
```

**Update the YAML file** with your values:
```bash
# Replace placeholders
sed -i '' "s/PROJECT_ID/$PROJECT_ID/g" backend-deployment.yaml
sed -i '' "s/CONNECTION_NAME/$SQL_CONNECTION/g" backend-deployment.yaml

# Deploy
kubectl apply -f backend-deployment.yaml
```

---

## Step 10: Get Your Public API URL

```bash
# Wait for external IP (takes 1-2 minutes)
kubectl get service package-backend -n backend --watch

# Once EXTERNAL-IP appears, save it
export API_URL=$(kubectl get service package-backend -n backend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Your API is available at: http://$API_URL"
```

**Your API is now live!** 🎉

Example: `http://34.123.45.67`

---

## Step 11: Run Database Migrations

```bash
# Create migration job
cat > migrate-db.yaml << 'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: backend
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: gcr.io/PROJECT_ID/package-backend:v1
        command: ["/bin/sh", "-c"]
        args:
          - |
            # Install psql
            apk add --no-cache postgresql-client
            
            # Run migrations
            for file in /app/db/migrations/*.sql; do
              PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$file"
              echo "Applied: $file"
            done
        env:
        - name: DB_HOST
          value: "127.0.0.1"
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: database
      
      - name: cloud-sql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:latest
        command: ["/cloud_sql_proxy", "-instances=CONNECTION_NAME=tcp:5432"]
      
      restartPolicy: Never
EOF

sed -i '' "s/PROJECT_ID/$PROJECT_ID/g" migrate-db.yaml
sed -i '' "s/CONNECTION_NAME/$SQL_CONNECTION/g" migrate-db.yaml

kubectl apply -f migrate-db.yaml

# Check migration status
kubectl logs -n backend job/db-migration -c migrate
```

---

## Step 12: Test Your API

```bash
# Save your API URL
API_URL=$(kubectl get service package-backend -n backend -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test health endpoint
curl http://$API_URL/health

# Expected response:
# {"status":"ok","message":"Package Management Backend is running"}

# Test registration
curl -X POST http://$API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "OWNER"
  }'

# Test login
curl -X POST http://$API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }'
```

---

## Step 13: Frontend Integration

### For Your Frontend (React/Vue/Angular)

```javascript
// config.js or .env
export const API_BASE_URL = 'http://YOUR_EXTERNAL_IP';

// Example API calls
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
async function login(username, password) {
  const response = await api.post('/auth/login', { username, password });
  const { token } = response.data;
  localStorage.setItem('token', token);
  return token;
}

// Upload package
async function uploadPackage(file, packageId, version, name, description) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('packageId', packageId);
  formData.append('version', version);
  formData.append('name', name);
  formData.append('description', description);

  const token = localStorage.getItem('token');
  const response = await api.post('/packages/upload', formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
}

// Download package
async function downloadPackage(packageId, version) {
  const response = await api.get(
    `/packages/${packageId}/${version}/download-file`,
    { responseType: 'blob' }
  );
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${packageId}-${version}.tar.gz`);
  document.body.appendChild(link);
  link.click();
}
```

---

## Step 14: Enable HTTPS (Optional but Recommended)

### Reserve Static IP

```bash
# Reserve a static IP
gcloud compute addresses create backend-ip --global

# Get the IP
gcloud compute addresses describe backend-ip --global --format="value(address)"
```

### Set up Domain (if you have one)

```bash
# Point your domain to the static IP
# Example: api.yourdomain.com → STATIC_IP

# Update service to use static IP
kubectl patch service package-backend -n backend -p \
  '{"metadata":{"annotations":{"cloud.google.com/load-balancer-type":"External"}}}'
```

### Use Google-managed SSL (for custom domain)

```yaml
# Create: ingress-https.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  namespace: backend
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "backend-ip"
    networking.gke.io/managed-certificates: "backend-cert"
spec:
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: package-backend
            port:
              number: 80
---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: backend-cert
  namespace: backend
spec:
  domains:
    - api.yourdomain.com
```

```bash
kubectl apply -f ingress-https.yaml
# Note: SSL cert provisioning takes 15-30 minutes
```

---

## Useful Commands

```bash
# View all pods
kubectl get pods --all-namespaces

# View backend logs
kubectl logs -n backend -l app=package-backend -f

# View service status
kubectl get service -n backend

# Restart backend
kubectl rollout restart deployment/package-backend -n backend

# Update backend (after code changes)
docker build -t gcr.io/$PROJECT_ID/package-backend:v2 .
docker push gcr.io/$PROJECT_ID/package-backend:v2
kubectl set image deployment/package-backend \
  backend=gcr.io/$PROJECT_ID/package-backend:v2 -n backend

# Scale backend
kubectl scale deployment package-backend -n backend --replicas=3

# Delete everything
kubectl delete namespace backend
./network down  # In test-network-k8s directory
gcloud container clusters delete $CLUSTER_NAME --region=$REGION
```

---

## Monitoring Costs

```bash
# View current spending
gcloud billing accounts list
gcloud billing projects describe $PROJECT_ID

# Set budget alerts (recommended!)
# Go to: https://console.cloud.google.com/billing/budgets
# Set alert at $50, $100, $150, $200 to avoid surprises
```

**Estimated Total Monthly Cost**: ~$70-80/month
- GKE Cluster: ~$60
- Cloud SQL: ~$7
- Cloud Storage: ~$0.50
- Load Balancer: ~$20
- **Total**: Within your $300 credits for ~4 months

---

## Summary

✅ **Fabric Network** - Running on GKE via test-network-k8s  
✅ **Backend API** - Deployed with LoadBalancer  
✅ **PostgreSQL** - Cloud SQL managed database  
✅ **File Storage** - Cloud Storage for packages  
✅ **Public Endpoint** - `http://YOUR_EXTERNAL_IP`  
✅ **Auto-scaling** - Kubernetes handles traffic  
✅ **Monitoring** - GCP Console + kubectl  

**Your API endpoints are now accessible for your frontend!** 🚀

Share the `API_URL` with your frontend team or use it in your frontend application configuration.
