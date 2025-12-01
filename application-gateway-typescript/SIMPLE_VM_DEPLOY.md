# Single VM Deployment - Demo Setup

Deploy everything (Fabric network + Backend + Database) on one GCP VM for a simple demo.

**Cost: ~$25/month** (vs $200+ for Kubernetes setup)

---

## Step 1: Create VM on GCP

```bash
# Set variables
export PROJECT_ID="your-project-id"
export VM_NAME="package-demo"
export ZONE="us-central1-a"

# Create VM with enough resources
gcloud compute instances create $VM_NAME \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=e2-standard-4 \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    --maintenance-policy=MIGRATE \
    --provisioning-model=STANDARD \
    --tags=http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=$VM_NAME,image=projects/ubuntu-os-cloud/global/images/ubuntu-2004-focal-v20231213,mode=rw,size=50,type=pd-standard \
    --no-shielded-secure-boot \
    --shielded-vtpm \
    --shielded-integrity-monitoring \
    --labels=env=demo \
    --reservation-affinity=any

# Get the external IP (save this!)
gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

**Save your VM's public IP** - this is what your frontend will use!

---

## Step 2: SSH into VM and Install Prerequisites

```bash
# SSH to VM
gcloud compute ssh $VM_NAME --zone=$ZONE

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install -y git jq

# Install PM2 for process management
sudo npm install -g pm2

# Logout and login again for docker group to take effect
exit
```

```bash
# SSH back in
gcloud compute ssh $VM_NAME --zone=$ZONE
```

---

## Step 3: Clone Your Repositories

```bash
# Clone test-network
cd ~
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples

# Clone your backend
cd ~
git clone YOUR_BACKEND_REPO_URL application-gateway-typescript
# OR upload your code manually
```

If you don't have a Git repo, copy your code:

```bash
# On your local machine
cd /Users/mac/Documents/cmu/fall-25/compiled
tar -czf backend.tar.gz application-gateway-typescript

gcloud compute scp backend.tar.gz $VM_NAME:~ --zone=$ZONE

# Back on VM
tar -xzf backend.tar.gz
```

---

## Step 4: Start Fabric Network

```bash
cd ~/fabric-samples/test-network

# Start the network
./network.sh up createChannel -c releasechannel -ca

# Deploy your chaincode
./network.sh deployCC -ccn SoftwareReleaseContract \
    -ccp ~/application-gateway-typescript/../my-asset-chaincode-template \
    -ccl java

# Verify network is running
docker ps
```

---

## Step 5: Set Up PostgreSQL with Docker

```bash
cd ~
mkdir -p postgres-data

# Create docker-compose for PostgreSQL
cat > postgres-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: package_postgres
    restart: always
    environment:
      POSTGRES_DB: package_management
      POSTGRES_USER: packageadmin
      POSTGRES_PASSWORD: packagepass123
    ports:
      - "5432:5432"
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U packageadmin"]
      interval: 10s
      timeout: 5s
      retries: 5
EOF

# Start PostgreSQL
docker-compose -f postgres-compose.yml up -d

# Wait for it to be ready
sleep 10

# Verify
docker ps | grep package_postgres
```

---

## Step 6: Configure Backend

```bash
cd ~/application-gateway-typescript

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=package_management
DB_USER=packageadmin
DB_PASSWORD=packagepass123

# JWT
JWT_SECRET=demo-secret-change-in-production
JWT_EXPIRES_IN=24h

# MFA
MFA_ISSUER=PackageManagement
MFA_APP_NAME=Package Management Demo

# Server
PORT=3000
NODE_ENV=production

# Fabric (from test-network)
CHANNEL_NAME=releasechannel
CHAINCODE_NAME=SoftwareReleaseContract
MSP_ID=Org1MSP
CRYPTO_PATH=/home/$USER/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com
PEER_ENDPOINT=localhost:7051
PEER_HOST_ALIAS=peer0.org1.example.com

# Admin
ADMIN_MSP_IDS=Org1MSP

# Email (optional - use your Mailtrap token)
MAILTRAP_TOKEN=your_token_here
MAILTRAP_SENDER_EMAIL=noreply@demo.com
MAILTRAP_SENDER_NAME=Package Demo

# Storage (local for demo)
STORAGE_PATH=./packages-storage
MAX_FILE_SIZE=104857600
EOF

# Create storage directory
mkdir -p packages-storage
```

---

## Step 7: Run Database Migrations

```bash
cd ~/application-gateway-typescript

# Run migrations
for file in db/migrations/*.sql; do
    docker exec -i package_postgres psql -U packageadmin -d package_management < "$file"
    echo "Applied: $file"
done

# Create admin user (optional)
docker exec -i package_postgres psql -U packageadmin -d package_management << 'SQL'
INSERT INTO users (username, email, password_hash, role) 
VALUES (
    'admin',
    'admin@demo.com',
    '$2b$10$8xKmW1qJ6YKZqZJZqZJZqOZJZqZJZqZJZqZJZqZJZqZJZqZJZqZJZ',
    'ADMIN'
);
SQL
```

---

## Step 8: Build and Start Backend

```bash
cd ~/application-gateway-typescript

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/app.js --name package-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command it outputs

# View logs
pm2 logs package-backend
```

---

## Step 9: Configure Firewall

```bash
# On your local machine, allow traffic to port 3000
gcloud compute firewall-rules create allow-backend \
    --project=$PROJECT_ID \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:3000 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=http-server
```

---

## Step 10: Test Your Deployment

```bash
# Get your VM's public IP
VM_IP=$(gcloud compute instances describe $VM_NAME --zone=$ZONE --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo "Your API URL: http://$VM_IP:3000"

# Test from your local machine
curl http://$VM_IP:3000/health

# Test registration
curl -X POST http://$VM_IP:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "role": "OWNER"
  }'

# Test login
curl -X POST http://$VM_IP:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }'
```

---

## Frontend Configuration

```javascript
// In your frontend .env or config
export const API_BASE_URL = 'http://YOUR_VM_IP:3000';

// All your API calls use this base URL
const api = axios.create({
  baseURL: API_BASE_URL
});

// Login example
await api.post('/auth/login', { username, password });

// Upload package
const formData = new FormData();
formData.append('file', file);
formData.append('packageId', 'com.test.app');
formData.append('version', '1.0.0');
formData.append('name', 'Test App');

await api.post('/packages/upload', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

---

## Useful Commands

```bash
# SSH to VM
gcloud compute ssh $VM_NAME --zone=$ZONE

# View backend logs
pm2 logs package-backend

# Restart backend
pm2 restart package-backend

# View all docker containers
docker ps -a

# View Fabric network status
cd ~/fabric-samples/test-network
docker ps

# Restart PostgreSQL
docker-compose -f ~/postgres-compose.yml restart

# Update backend code
cd ~/application-gateway-typescript
git pull  # or upload new code
npm install
npm run build
pm2 restart package-backend

# Monitor resources
htop
docker stats
```

---

## Stop/Start Everything

```bash
# Stop all services
pm2 stop package-backend
docker-compose -f ~/postgres-compose.yml down
cd ~/fabric-samples/test-network && ./network.sh down

# Start all services
cd ~/fabric-samples/test-network && ./network.sh up createChannel -c releasechannel
docker-compose -f ~/postgres-compose.yml up -d
pm2 start package-backend
```

---

## Cost Breakdown

| Component | Cost/Month |
|-----------|------------|
| e2-standard-4 VM | ~$120 |
| 50GB Disk | ~$8 |
| Egress (10GB) | ~$1 |
| **Total** | **~$130/month** |

**Even cheaper option:** Use `e2-medium` (~$25/month) for very low traffic demos

---

## Advantages of Single VM

✅ **Simple** - Everything in one place  
✅ **Cheap** - Single VM cost  
✅ **Easy to debug** - SSH in and check logs  
✅ **Perfect for demos** - No complex orchestration  
✅ **Quick setup** - ~30 minutes total  
✅ **Easy to tear down** - Just delete the VM  

---

## When to Upgrade to Kubernetes

Consider Kubernetes when you need:
- Auto-scaling
- High availability (multiple replicas)
- Production-grade deployment
- Multiple environments (dev/staging/prod)
- More than 100 concurrent users

For a demo/prototype, **single VM is perfect!** 🎯
