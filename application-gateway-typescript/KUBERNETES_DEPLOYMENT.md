# Kubernetes Deployment Guide - Package Management System

Deploy your Hyperledger Fabric network and backend to Google Kubernetes Engine (GKE) using your existing test-network-k8 setup.

---

## Why Kubernetes is Easier

✅ **No VM management** - Kubernetes handles infrastructure  
✅ **Auto-scaling** - Automatically scales based on load  
✅ **Self-healing** - Restarts failed containers automatically  
✅ **Easy updates** - Rolling updates with zero downtime  
✅ **Built-in load balancing** - No manual LB setup needed  
✅ **Declarative config** - Define desired state, K8s handles the rest  

---

## Prerequisites

```bash
# Install kubectl
gcloud components install kubectl

# Install Helm (for Fabric deployment)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Set variables
export PROJECT_ID="package-management-prod"
export CLUSTER_NAME="fabric-cluster"
export REGION="us-central1"
```

---

## Step 1: Create GKE Cluster

```bash
# Enable required APIs
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com

# Create GKE cluster
gcloud container clusters create $CLUSTER_NAME \
    --region=$REGION \
    --num-nodes=3 \
    --machine-type=e2-standard-4 \
    --enable-autoscaling \
    --min-nodes=3 \
    --max-nodes=10 \
    --enable-autorepair \
    --enable-autoupgrade \
    --enable-ip-alias \
    --network=default \
    --subnetwork=default

# Get credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION

# Verify connection
kubectl get nodes
```

---

## Step 2: Set Up PostgreSQL (Cloud SQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create package-db \
    --database-version=POSTGRES_16 \
    --tier=db-f1-micro \
    --region=$REGION

# Set password
gcloud sql users set-password postgres \
    --instance=package-db \
    --password="STRONG_PASSWORD"

# Create database
gcloud sql databases create package_management --instance=package-db

# Create user
gcloud sql users create packageadmin \
    --instance=package-db \
    --password="APP_PASSWORD"

# Get connection name
export SQL_CONNECTION_NAME=$(gcloud sql instances describe package-db --format="value(connectionName)")
echo $SQL_CONNECTION_NAME
```

---

## Step 3: Deploy Hyperledger Fabric on Kubernetes

### Using Hyperledger Fabric Operator

```bash
# Add Hyperledger Fabric Helm repo
helm repo add kfs https://hyperledger.github.io/bevel-operator-fabric
helm repo update

# Install Fabric Operator
kubectl create namespace fabric

helm install hlf-operator kfs/hlf-operator \
    --namespace fabric \
    --set image.tag=v1.9.0

# Wait for operator to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=hlf-operator -n fabric --timeout=180s
```

### Deploy Fabric CA

```yaml
# Create: fabric-ca.yaml
apiVersion: hlf.hyperledger.org/v1alpha1
kind: FabricCA
metadata:
  name: org1-ca
  namespace: fabric
spec:
  hosts:
    - org1-ca
  subject:
    cn: ca
    C: US
    ST: "California"
    L: "San Francisco"
    O: Org1
    OU: Blockchain
  tlsSubject:
    cn: tlsca
    C: US
    ST: "California"
    L: "San Francisco"
    O: Org1
    OU: Blockchain
  db:
    type: postgres
    datasource: "host=package-db.default.svc.cluster.local port=5432 user=fabric password=fabricpw dbname=fabric_ca sslmode=disable"
  image: hyperledger/fabric-ca:1.5.5
  version: 1.5.5
  ingress:
    enabled: true
    className: nginx
    hosts:
      - host: org1-ca.example.com
        paths:
          - path: /
            pathType: Prefix
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
```

```bash
kubectl apply -f fabric-ca.yaml
```

### Deploy Fabric Peer

```yaml
# Create: fabric-peer.yaml
apiVersion: hlf.hyperledger.org/v1alpha1
kind:  FabricPeer
metadata:
  name: org1-peer0
  namespace: fabric
spec:
  image: hyperledger/fabric-peer:2.5.0
  replicas: 1
  dockerSocketPath: /var/run/docker.sock
  hosts:
    - org1-peer0
  mspID: Org1MSP
  secret:
    enrollment:
      component:
        cahost: org1-ca
        caname: ca
        caport: 7054
        catls:
          cacert: ""
        enrollid: peer
        enrollsecret: peerpw
      tls:
        cahost: org1-ca
        caname: tlsca
        caport: 7054
        catls:
          cacert: ""
        enrollid: peer
        enrollsecret: peerpw
  stateDb: CouchDB
  storage:
    peer:
      size: 20Gi
      storageClass: standard
    couchdb:
      size: 10Gi
      storageClass: standard
  resources:
    peer:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2
        memory: 4Gi
    couchdb:
      requests:
        cpu: 100m
        memory: 512Mi
```

```bash
kubectl apply -f fabric-peer.yaml
```

### Deploy Fabric Orderer

```yaml
# Create: fabric-orderer.yaml
apiVersion: hlf.hyperledger.org/v1alpha1
kind: FabricOrdererNode
metadata:
  name: orderer0
  namespace: fabric
spec:
  image: hyperledger/fabric-orderer:2.5.0
  mspID: OrdererMSP
  replicas: 1
  storage:
    size: 20Gi
    storageClass: standard
  service:
    type: ClusterIP
  secret:
    enrollment:
      component:
        cahost: orderer-ca
        caname: ca
        caport: 7054
        enrollid: orderer
        enrollsecret: ordererpw
```

```bash
kubectl apply -f fabric-orderer.yaml
```

---

## Step 4: Create Kubernetes Secrets

```bash
# Create namespace for backend
kubectl create namespace backend

# Create database credentials secret
kubectl create secret generic db-credentials \
    --namespace=backend \
    --from-literal=host="$SQL_CONNECTION_NAME" \
    --from-literal=user=packageadmin \
    --from-literal=password=APP_PASSWORD \
    --from-literal=database=package_management

# Create JWT secret
JWT_SECRET=$(openssl rand -base64 32)
kubectl create secret generic jwt-secret \
    --namespace=backend \
    --from-literal=secret=$JWT_SECRET

# Create Mailtrap secret
kubectl create secret generic mailtrap-secret \
    --namespace=backend \
    --from-literal=token=YOUR_MAILTRAP_TOKEN

# Create GCS service account key
gcloud iam service-accounts keys create gcs-key.json \
    --iam-account=backend-sa@${PROJECT_ID}.iam.gserviceaccount.com

kubectl create secret generic gcs-key \
    --namespace=backend \
    --from-file=key.json=gcs-key.json

rm gcs-key.json
```

---

## Step 5: Deploy Node.js Backend

### Create Deployment

```yaml
# Create: backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: package-backend
  namespace: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: package-backend
  template:
    metadata:
      labels:
        app: package-backend
    spec:
      serviceAccountName: backend-sa
      containers:
      - name: backend
        image: gcr.io/${PROJECT_ID}/package-backend:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        
        # Database
        - name: DB_HOST
          value: "127.0.0.1"  # Cloud SQL proxy sidecar
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
        
        # JWT
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: JWT_EXPIRES_IN
          value: "24h"
        
        # Mailtrap
        - name: MAILTRAP_TOKEN
          valueFrom:
            secretKeyRef:
              name: mailtrap-secret
              key: token
        - name: MAILTRAP_SENDER_EMAIL
          value: "noreply@yourdomain.com"
        
        # Fabric
        - name: CHANNEL_NAME
          value: "releasechannel"
        - name: CHAINCODE_NAME
          value: "SoftwareReleaseContract"
        - name: MSP_ID
          value: "Org1MSP"
        - name: PEER_ENDPOINT
          value: "org1-peer0.fabric.svc.cluster.local:7051"
        - name: CRYPTO_PATH
          value: "/fabric/crypto"
        
        # Storage
        - name: GCS_BUCKET
          value: "package-storage-${PROJECT_ID}"
        - name: MAX_FILE_SIZE
          value: "104857600"
        
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2
            memory: 2Gi
        
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
          initialDelaySeconds: 5
          periodSeconds: 5
        
        volumeMounts:
        - name: fabric-crypto
          mountPath: /fabric/crypto
          readOnly: true
        - name: gcs-key
          mountPath: /secrets/gcs
          readOnly: true
      
      # Cloud SQL Proxy sidecar
      - name: cloud-sql-proxy
        image: gcr.io/cloudsql-docker/gce-proxy:latest
        command:
          - "/cloud_sql_proxy"
          - "-instances=${SQL_CONNECTION_NAME}=tcp:5432"
        securityContext:
          runAsNonRoot: true
      
      volumes:
      - name: fabric-crypto
        secret:
          secretName: fabric-crypto
      - name: gcs-key
        secret:
          secretName: gcs-key
---
apiVersion: v1
kind: Service
metadata:
  name: package-backend
  namespace: backend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    name: http
  selector:
    app: package-backend
```

```bash
kubectl apply -f backend-deployment.yaml
```

---

## Step 6: Build and Push Docker Image

### Create Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/app.js"]
```

### Build and Push

```bash
# Build image
docker build -t gcr.io/${PROJECT_ID}/package-backend:latest .

# Configure Docker for GCR
gcloud auth configure-docker

# Push image
docker push gcr.io/${PROJECT_ID}/package-backend:latest
```

---

## Step 7: Set Up Ingress (HTTPS)

```yaml
# Create: ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: package-backend-ingress
  namespace: backend
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "backend-ip"
    networking.gke.io/managed-certificates: "backend-cert"
    kubernetes.io/ingress.allow-http: "false"
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
# Reserve static IP
gcloud compute addresses create backend-ip --global

# Get IP address
gcloud compute addresses describe backend-ip --global --format="value(address)"

# Update DNS to point to this IP

# Apply ingress
kubectl apply -f ingress.yaml

# Wait for certificate (takes 15-30 minutes)
kubectl describe managedcertificate backend-cert -n backend
```

---

## Step 8: Run Database Migrations

```bash
# Create migration job
cat > migration-job.yaml << 'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: backend
spec:
  template:
    spec:
      containers:
      - name: migration
        image: gcr.io/${PROJECT_ID}/package-backend:latest
        command: ["/bin/sh", "-c"]
        args:
          - |
            apk add --no-cache postgresql-client
            for file in /app/db/migrations/*.sql; do
              PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$file"
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
        command: ["/cloud_sql_proxy", "-instances=${SQL_CONNECTION_NAME}=tcp:5432"]
      restartPolicy: Never
EOF

kubectl apply -f migration-job.yaml

# Check status
kubectl logs -n backend job/db-migration
```

---

## Step 9: Auto-Scaling Configuration

```yaml
# Create: hpa.yaml (Horizontal Pod Autoscaler)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: package-backend-hpa
  namespace: backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: package-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa.yaml
```

---

## Step 10: Monitoring & Logging

### Enable GKE Monitoring

```bash
# Install metrics server (if not already)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View metrics
kubectl top nodes
kubectl top pods -n backend
```

### View Logs

```bash
# View backend logs
kubectl logs -n backend -l app=package-backend -f

# View logs in Cloud Logging
gcloud logging read "resource.type=k8s_container AND resource.labels.namespace_name=backend" --limit 50
```

---

## Quick Deployment Script

```bash
#!/bin/bash
# deploy.sh - One-command deployment

set -e

# Build and push
docker build -t gcr.io/${PROJECT_ID}/package-backend:latest .
docker push gcr.io/${PROJECT_ID}/package-backend:latest

# Update deployment
kubectl set image deployment/package-backend \
    backend=gcr.io/${PROJECT_ID}/package-backend:latest \
    -n backend

# Wait for rollout
kubectl rollout status deployment/package-backend -n backend

# Verify
kubectl get pods -n backend
echo "Deployment complete!"
```

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Benefits of Kubernetes Deployment

| Feature | Manual VMs | Kubernetes |
|---------|-----------|------------|
| Setup Time | Hours | Minutes |
| Scaling | Manual | Automatic |
| Updates | Complex | `kubectl apply` |
| Load Balancing | Configure manually | Built-in |
| Self-Healing | None | Automatic |
| SSL/HTTPS | Manual setup | ManagedCertificate |
| Monitoring | Setup required | Built-in |
| Cost | Higher (always-on VMs) | Lower (auto-scale to zero) |

---

## Testing

```bash
# Test health endpoint
curl https://api.yourdomain.com/health

# View deployment status
kubectl get deployment -n backend
kubectl get pods -n backend
kubectl get svc -n backend
kubectl get ingress -n backend

# Describe pod
kubectl describe pod -n backend -l app=package-backend

# Execute into pod
kubectl exec -it -n backend deployment/package-backend -- /bin/sh
```

---

## Cost Optimization

```bash
# Use preemptible nodes (70% cheaper) for dev
gcloud container node-pools create preemptible-pool \
    --cluster=$CLUSTER_NAME \
    --region=$REGION \
    --preemptible \
    --num-nodes=2 \
    --machine-type=e2-standard-2

# Enable cluster autoscaling
gcloud container clusters update $CLUSTER_NAME \
    --region=$REGION \
    --enable-autoscaling \
    --min-nodes=1 \
    --max-nodes=5

# Use workload identity (more secure)
gcloud container clusters update $CLUSTER_NAME \
    --workload-pool=${PROJECT_ID}.svc.id.goog \
    --region=$REGION
```

---

## Summary

**Kubernetes deployment is much simpler:**

✅ **Single command deployment**: `kubectl apply -f`  
✅ **Auto-scaling**: Handles traffic spikes automatically  
✅ **Zero-downtime updates**: Rolling deployments  
✅ **Built-in load balancing**: No manual configuration  
✅ **Self-healing**: Restarts failed pods  
✅ **Easy rollback**: `kubectl rollout undo`  
✅ **Cost-effective**: Scale to zero during low traffic  

**Estimated Monthly Cost: ~$150-200** (vs $200-300 for VMs)

Your API is production-ready with Kubernetes! 🚀
