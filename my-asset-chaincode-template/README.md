# Simple Asset Publishing Chaincode Template

This is a ready-to-use Java chaincode template for publishing assets to a Fabric network.

## Quick Start

1. Copy this directory to your project location
2. Build: `./gradlew shadowJar`
3. Deploy: See PROJECT_SETUP_GUIDE.md

## Project Structure

```
my-asset-chaincode-template/
├── build.gradle              # Build configuration
├── settings.gradle           # Gradle settings
├── src/
│   └── main/
│       └── java/
│           └── org/
│               └── example/
│                   └── asset/
│                       ├── Asset.java          # Asset data model
│                       └── AssetContract.java  # Chaincode contract
└── README.md
```

## Files Included

- **Asset.java**: Simple asset data model
- **AssetContract.java**: Complete chaincode with PublishAsset function
- **build.gradle**: Gradle build file with all dependencies

## Usage

After deployment, you can invoke:

```bash
# Publish an asset
peer chaincode invoke -C mychannel -n assetcontract \
  -c '{"function":"PublishAsset","Args":["asset1","My Asset","Description","Org1","1000"]}'

# Read an asset
peer chaincode query -C mychannel -n assetcontract \
  -c '{"function":"ReadAsset","Args":["asset1"]}'

# Get all assets
peer chaincode query -C mychannel -n assetcontract \
  -c '{"function":"GetAllAssets","Args":[]}'
```


