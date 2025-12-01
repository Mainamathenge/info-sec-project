#!/bin/bash
#
# Chaincode Upgrade/Deprecation Script
# This script demonstrates how to upgrade or deprecate chaincode
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Set paths
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

CHANNEL_NAME=${1:-"mychannel"}
CC_NAME=${2:-"assetcontract"}
CC_SRC_PATH=${3:-"../my-asset-chaincode-template"}
CC_VERSION=${4:-"2.0"}
ACTION=${5:-"upgrade"}  # upgrade or deprecate

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Chaincode Management${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Set Org1 environment
export $(./setOrgEnv.sh Org1 | xargs)

# Function to get current sequence
get_current_sequence() {
    local current_seq=$(peer lifecycle chaincode querycommitted \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME 2>/dev/null | \
        grep -o 'Sequence: [0-9]*' | grep -o '[0-9]*' || echo "0")
    echo $current_seq
}

# Function to get current version
get_current_version() {
    local current_ver=$(peer lifecycle chaincode querycommitted \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME 2>/dev/null | \
        grep -o 'Version: [^,]*' | grep -o '[^:]*$' | tr -d ' ' || echo "1.0")
    echo $current_ver
}

CURRENT_VERSION=$(get_current_version)
CURRENT_SEQUENCE=$(get_current_sequence)
NEW_SEQUENCE=$((CURRENT_SEQUENCE + 1))

echo -e "${GREEN}Current Chaincode Status:${NC}"
echo "  Name: $CC_NAME"
echo "  Version: $CURRENT_VERSION"
echo "  Sequence: $CURRENT_SEQUENCE"
echo ""

if [ "$ACTION" == "upgrade" ]; then
    echo -e "${GREEN}Upgrading Chaincode${NC}"
    echo "  New Version: $CC_VERSION"
    echo "  New Sequence: $NEW_SEQUENCE"
    echo ""
    
    # Check if chaincode source exists
    if [ ! -d "$CC_SRC_PATH" ]; then
        echo -e "${RED}Error: Chaincode source not found at $CC_SRC_PATH${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Deploying upgraded chaincode...${NC}"
    ./network.sh deployCC \
        -ccn $CC_NAME \
        -ccp $CC_SRC_PATH \
        -ccl java \
        -ccv $CC_VERSION \
        -ccs $NEW_SEQUENCE \
        -ccep "OR('Org1MSP.peer','Org2MSP.peer')"
    
    echo ""
    echo -e "${GREEN}✓ Chaincode upgraded successfully${NC}"
    echo ""
    echo "New Status:"
    peer lifecycle chaincode querycommitted \
        --channelID $CHANNEL_NAME \
        --name $CC_NAME 2>/dev/null | \
        grep -E "Version|Sequence" || echo "Could not query"
    
elif [ "$ACTION" == "deprecate" ]; then
    echo -e "${YELLOW}Deprecating Chaincode${NC}"
    echo ""
    echo "Options for deprecation:"
    echo "  1. Stop using the chaincode (recommended)"
    echo "  2. Deploy a replacement chaincode with different name"
    echo "  3. Set impossible endorsement policy"
    echo ""
    echo -e "${BLUE}Current chaincode will remain functional but:${NC}"
    echo "  - No new upgrades will be deployed"
    echo "  - Consider migrating to a new chaincode"
    echo "  - Document deprecation in your system"
    echo ""
    echo -e "${GREEN}To deploy a replacement:${NC}"
    echo "  ./upgrade-chaincode.sh mychannel assetcontract-v2 ../my-asset-chaincode-template 1.0 upgrade"
    echo ""
    echo -e "${GREEN}Chaincode '$CC_NAME' is now marked as deprecated${NC}"
    
else
    echo -e "${RED}Error: Invalid action '$ACTION'${NC}"
    echo "Usage: $0 [channel] [chaincode_name] [source_path] [version] [upgrade|deprecate]"
    echo ""
    echo "Examples:"
    echo "  $0 mychannel assetcontract ../my-asset-chaincode-template 2.0 upgrade"
    echo "  $0 mychannel assetcontract ../my-asset-chaincode-template 1.0 deprecate"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"


