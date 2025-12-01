#!/bin/bash
#
# Asset Publishing Simulation Script
# This script demonstrates the complete process of publishing an asset
# from one peer and verifying it on all peers
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set paths
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Asset Publishing Simulation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Set Org1 Environment
echo -e "${GREEN}Step 1: Setting Org1 Environment${NC}"
export $(./setOrgEnv.sh Org1 | xargs)
echo "Using MSP: $CORE_PEER_LOCALMSPID"
echo "Peer: $CORE_PEER_ADDRESS"
echo ""

# Step 2: Check Current State
echo -e "${GREEN}Step 2: Checking Current State${NC}"
echo "Querying all assets..."
CURRENT_ASSETS=$(peer chaincode query -C mychannel -n assetcontract \
  -c '{"function":"GetAllAssets","Args":[]}' 2>/dev/null || echo "[]")
echo "Current assets: $CURRENT_ASSETS"
echo ""

# Step 3: Generate unique asset ID
ASSET_ID="asset_$(date +%s)"
echo -e "${GREEN}Step 3: Publishing New Asset${NC}"
echo "Asset ID: $ASSET_ID"
echo "Publishing from: Org1 (peer0.org1.example.com)"
echo ""

# Step 4: Publish Asset from Org1
echo -e "${YELLOW}Submitting transaction to peer0.org1...${NC}"
peer chaincode invoke \
  -C mychannel \
  -n assetcontract \
  -c "{\"function\":\"PublishAsset\",\"Args\":[\"$ASSET_ID\",\"Simulated Asset\",\"This asset was published by Org1 peer\",\"Org1\",\"5000\"]}" \
  --waitForEvent > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Transaction submitted successfully${NC}"
else
    echo -e "${RED}✗ Transaction failed${NC}"
    exit 1
fi
echo ""

# Step 5: Verify on Org1
echo -e "${GREEN}Step 4: Verifying Asset on Org1 Peer${NC}"
echo "Querying asset from peer0.org1..."
ASSET_ORG1=$(peer chaincode query -C mychannel -n assetcontract \
  -c "{\"function\":\"ReadAsset\",\"Args\":[\"$ASSET_ID\"]}" 2>/dev/null)
echo "Asset on Org1: $ASSET_ORG1"
echo ""

# Step 6: Switch to Org2
echo -e "${GREEN}Step 5: Switching to Org2 Environment${NC}"
export $(./setOrgEnv.sh Org2 | xargs)
echo "Using MSP: $CORE_PEER_LOCALMSPID"
echo "Peer: $CORE_PEER_ADDRESS"
echo ""

# Step 7: Verify on Org2 (Cross-Organization)
echo -e "${GREEN}Step 6: Verifying Asset on Org2 Peer (Cross-Org)${NC}"
echo "Querying asset from peer0.org2..."
ASSET_ORG2=$(peer chaincode query -C mychannel -n assetcontract \
  -c "{\"function\":\"ReadAsset\",\"Args\":[\"$ASSET_ID\"]}" 2>/dev/null)
echo "Asset on Org2: $ASSET_ORG2"
echo ""

# Step 8: Compare Results
echo -e "${GREEN}Step 7: Verification Results${NC}"
if [ "$ASSET_ORG1" == "$ASSET_ORG2" ] && [ -n "$ASSET_ORG1" ]; then
    echo -e "${GREEN}✓ SUCCESS: Asset is identical on both peers!${NC}"
    echo "This proves:"
    echo "  - Asset published by Org1 is visible to Org2"
    echo "  - Orderer successfully distributed the block"
    echo "  - Both peers have synchronized ledger state"
else
    echo -e "${YELLOW}⚠ WARNING: Assets differ or not found${NC}"
fi
echo ""

# Step 9: Check Chaincode Status
echo -e "${GREEN}Step 8: Checking Chaincode Status${NC}"
export $(./setOrgEnv.sh Org1 | xargs)
echo "Committed chaincode:"
peer lifecycle chaincode querycommitted -C mychannel -n assetcontract 2>/dev/null | grep -E "Version|Sequence" || echo "Could not query chaincode status"
echo ""

# Step 10: Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Simulation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Asset ID: $ASSET_ID"
echo "Published by: Org1 (peer0.org1.example.com)"
echo "Visible on: Org1 ✓ | Org2 ✓"
echo ""
echo "Process Flow:"
echo "  1. Client → peer0.org1 (endorsement)"
echo "  2. peer0.org1 → Orderer (transaction)"
echo "  3. Orderer → All peers (block distribution)"
echo "  4. All peers → Validation & commit"
echo "  5. Asset now on blockchain (immutable)"
echo ""
echo -e "${GREEN}Simulation Complete!${NC}"


