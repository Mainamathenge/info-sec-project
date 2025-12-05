# Blockchain-Based Package Management System

A decentralized package management system built on **Hyperledger Fabric** that provides secure, tamper-proof software release tracking and validation. This project addresses critical vulnerabilities in centralized package registries through blockchain technology.

![Package Management Architecture](./package_management_architecture.png)

## 🎯 Overview

This system leverages blockchain technology to create an immutable, transparent record of software releases, ensuring package integrity and preventing supply chain attacks. Built with Hyperledger Fabric, it provides a distributed ledger for tracking software packages, their versions, and cryptographic hashes.

### Key Features

- 🔐 **Immutable Release Tracking** - All package releases are recorded on the blockchain
- ✅ **Cryptographic Validation** - SHA-256 hash verification for package integrity
- 🔄 **Version Management** - Complete version history with discontinuation support
- 👥 **Multi-Organization Support** - Decentralized trust model across organizations
- 🌐 **Modern Web Interface** - React-based frontend with TypeScript
- 🔗 **RESTful API** - Node.js backend with Fabric Gateway integration
- 📊 **Real-time Monitoring** - Prometheus & Grafana integration

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                     │
│              TypeScript + TailwindCSS + React Router         │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────────┐
│              Node.js Backend (Express)                       │
│           Fabric Gateway SDK + TypeScript                    │
└─────────────────────┬───────────────────────────────────────┘
                      │ gRPC
┌─────────────────────▼───────────────────────────────────────┐
│              Hyperledger Fabric Network                      │
│    Peers | Orderers | CAs | Chaincode (Java)                │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for navigation
- Axios for API communication
- Lucide React for icons

**Backend:**
- Node.js with Express
- Fabric Gateway SDK
- TypeScript
- gRPC for Fabric communication

**Blockchain:**
- Hyperledger Fabric 2.5+
- Java Chaincode (Gradle)
- CouchDB for state database
- Docker & Docker Compose

## 📁 Project Structure

```
.
├── package-management-frontend/    # React frontend application
│   ├── src/
│   │   ├── pages/                 # Page components
│   │   ├── components/            # Reusable UI components
│   │   └── App.tsx               # Main application
│   └── package.json
│
├── fabric-server-template/         # Node.js backend server
│   ├── src/
│   │   └── server.ts             # Express API server
│   └── package.json
│
├── my-asset-chaincode-template/    # Java chaincode
│   ├── src/main/java/org/example/asset/
│   │   ├── SoftwareRelease.java
│   │   ├── SoftwareReleaseContract.java
│   │   ├── Asset.java
│   │   └── AssetContract.java
│   └── build.gradle
│
├── test-network/                   # Fabric network configuration
│   ├── network.sh                 # Network management script
│   ├── compose/                   # Docker compose files
│   ├── configtx/                  # Channel configuration
│   └── organizations/             # Crypto materials
│
└── bin/                           # Fabric binaries
```

## 🚀 Getting Started

### Prerequisites

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) and **npm** (v9+)
- **Java JDK** (v11+) and **Gradle** (v7+)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd compiled
   ```

2. **Install Fabric binaries and Docker images**
   ```bash
   ./install-fabric.sh
   ```

3. **Start the Fabric network**
   ```bash
   cd test-network
   ./network.sh up createChannel -c releasechannel -ca
   ```

4. **Deploy the chaincode**
   ```bash
   ./network.sh deployCC -ccn assetcontract -ccp ../my-asset-chaincode-template -ccl java
   ```

5. **Install backend dependencies**
   ```bash
   cd ../fabric-server-template
   npm install
   ```

6. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your network configuration
   ```

7. **Start the backend server**
   ```bash
   npm run dev
   ```

8. **Install and run frontend**
   ```bash
   cd ../package-management-frontend
   npm install
   npm run dev
   ```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

## 📚 API Documentation

### Software Release Endpoints

#### Publish Release
```bash
POST /api/releases
Content-Type: application/json

{
  "packageId": "com.example.myapp",
  "version": "1.0.0",
  "fileHash": "sha256:abc123..."
}
```

#### Validate Release
```bash
POST /api/releases/validate
Content-Type: application/json

{
  "packageId": "com.example.myapp",
  "version": "1.0.0",
  "fileHash": "sha256:abc123..."
}
```

#### Get Release Details
```bash
GET /api/releases/:packageId/:version
```

#### Discontinue Release
```bash
PUT /api/releases/:packageId/:version/discontinue
```

### Asset Management Endpoints

```bash
GET    /api/assets              # Get all assets
GET    /api/assets/:assetID     # Get specific asset
POST   /api/assets              # Create new asset
PUT    /api/assets/:assetID     # Update asset
DELETE /api/assets/:assetID     # Delete asset
```

## 🔧 Development

### Running Tests

```bash
# Backend tests
cd fabric-server-template
npm test

# Frontend tests
cd package-management-frontend
npm test
```

### Building for Production

```bash
# Build frontend
cd package-management-frontend
npm run build

# Build backend
cd fabric-server-template
npm run build
```

### Chaincode Development

```bash
cd my-asset-chaincode-template
./gradlew build
./gradlew test
```

## 🐳 Docker Deployment

The project includes Docker Compose configurations for easy deployment:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Monitoring

The system includes Prometheus and Grafana for monitoring:

```bash
cd test-network/prometheus-grafana
docker-compose up -d
```

Access Grafana at http://localhost:3001 (default credentials: admin/admin)

## 🔐 Security Features

- **Cryptographic Hash Verification** - SHA-256 hashing for package integrity
- **Immutable Audit Trail** - All transactions recorded on blockchain
- **Multi-Signature Support** - Endorsement policies for critical operations
- **TLS/SSL Encryption** - Secure communication between components
- **Identity Management** - Certificate-based authentication via Fabric CA

## 🎨 Frontend Features

- **User Authentication** - Login, registration, and MFA support
- **Package Management** - Upload, browse, download, and validate packages
- **Subscription Management** - Track package subscriptions
- **User Profiles** - Manage user information and preferences
- **Responsive Design** - Mobile-friendly interface
- **Real-time Updates** - Live package status updates

## 📖 Documentation

- [Fabric Server Guide](./fabric-server-template/README.md)
- [Chaincode Development](./my-asset-chaincode-template/README.md)
- [Network Configuration](./test-network/README.md)
- [Chaincode as a Service Tutorial](./test-network/CHAINCODE_AS_A_SERVICE_TUTORIAL.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built on [Hyperledger Fabric](https://www.hyperledger.org/use/fabric)
- Inspired by the need for secure, decentralized package management
- Part of CMU Information Security coursework

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note:** This is an academic project demonstrating blockchain-based package management. For production use, additional security hardening and testing are recommended.
