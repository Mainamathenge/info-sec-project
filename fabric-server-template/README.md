# Fabric Server Template

Production-ready server application for connecting to Hyperledger Fabric network.

## Features

- ✅ REST API for asset management
- ✅ Long-lived Gateway connections (best practice)
- ✅ TypeScript with type safety
- ✅ Error handling
- ✅ Environment-based configuration
- ✅ Graceful shutdown

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update paths:

```bash
cp .env.example .env
```

Edit `.env` with your network configuration.

### 3. Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Publish Asset
```bash
POST /api/assets
Content-Type: application/json

{
  "assetID": "asset1",
  "name": "My Asset",
  "description": "Test asset",
  "owner": "Org1",
  "value": 1000
}
```

### Read Asset
```bash
GET /api/assets/:assetID
```

### Get All Assets
```bash
GET /api/assets
```

### Update Asset
```bash
PUT /api/assets/:assetID
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "owner": "Org2",
  "value": 2000
}
```

### Delete Asset
```bash
DELETE /api/assets/:assetID
```

## Testing

### Using curl

```bash
# Publish asset
curl -X POST http://localhost:3000/api/assets \
  -H "Content-Type: application/json" \
  -d '{
    "assetID": "asset1",
    "name": "Test Asset",
    "description": "Description",
    "owner": "Org1",
    "value": 1000
  }'

# Read asset
curl http://localhost:3000/api/assets/asset1

# Get all assets
curl http://localhost:3000/api/assets
```

## Configuration

All configuration is done via environment variables (see `.env.example`):

- `CHANNEL_NAME`: Fabric channel name
- `CHAINCODE_NAME`: Chaincode name
- `MSP_ID`: Membership Service Provider ID
- `PEER_ENDPOINT`: Peer gRPC endpoint
- `PEER_HOST_ALIAS`: Peer TLS hostname override
- `CRYPTO_PATH`: Path to crypto materials
- `PORT`: Server port

## Production Considerations

1. **Security**:
   - Use HTTPS/TLS
   - Implement authentication/authorization
   - Store credentials securely (use secret management)

2. **Performance**:
   - Gateway connection is reused (already implemented)
   - Consider connection pooling for multiple peers
   - Add caching for read operations

3. **Monitoring**:
   - Add logging (Winston, Pino, etc.)
   - Add metrics (Prometheus, etc.)
   - Add health checks

4. **Error Handling**:
   - Implement retry logic
   - Add circuit breakers
   - Handle network failures gracefully

## Architecture

```
Client Request
    ↓
Express Router
    ↓
Fabric Gateway SDK
    ↓
Fabric Network (Peers/Orderers)
```

The Gateway connection is created once at startup and reused for all requests (best practice).

## See Also

- `PRODUCTION_SERVER_GUIDE.md` - Detailed guide
- `asset-transfer-basic/rest-api-typescript/` - Full-featured example


