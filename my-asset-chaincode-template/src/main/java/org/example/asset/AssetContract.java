/*
 * SPDX-License-Identifier: Apache-2.0
 */

package org.example.asset;

import java.util.ArrayList;
import java.util.List;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.License;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import org.hyperledger.fabric.shim.ledger.KeyValue;
import org.hyperledger.fabric.shim.ledger.QueryResultsIterator;

import com.owlike.genson.Genson;

@Contract(
    name = "assetcontract",
    info = @Info(
        title = "Asset Publishing Contract",
        description = "Simple contract for publishing and managing assets on the blockchain",
        version = "1.0.0",
        license = @License(
            name = "Apache 2.0 License",
            url = "http://www.apache.org/licenses/LICENSE-2.0.html"),
        contact = @org.hyperledger.fabric.contract.annotation.Contact(
            email = "admin@example.com",
            name = "Asset Contract Admin")))
@Default
public class AssetContract implements ContractInterface {

    private final Genson genson = new Genson();

    private enum AssetErrors {
        ASSET_NOT_FOUND,
        ASSET_ALREADY_EXISTS
    }

    /**
     * Initialize ledger with sample assets (optional - can be called once)
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public void InitLedger(final Context ctx) {
        publishAsset(ctx, new Asset("asset1", "Sample Asset 1", "First sample asset", "Org1", 1000));
        publishAsset(ctx, new Asset("asset2", "Sample Asset 2", "Second sample asset", "Org2", 2000));
        System.out.println("Ledger initialized with sample assets");
    }

    /**
     * Publish a new asset to the ledger.
     * This is the main function for publishing assets to the blockchain.
     * 
     * @param ctx the transaction context
     * @param assetID unique identifier for the asset
     * @param name name of the asset
     * @param description description of the asset
     * @param owner owner of the asset
     * @param value value of the asset
     * @return the published asset
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Asset PublishAsset(final Context ctx, 
                             final String assetID, 
                             final String name, 
                             final String description,
                             final String owner, 
                             final int value) {
        
        // Check if asset already exists
        if (AssetExists(ctx, assetID)) {
            String errorMessage = String.format("Asset %s already exists", assetID);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, AssetErrors.ASSET_ALREADY_EXISTS.toString());
        }

        // Create and publish the asset
        Asset asset = new Asset(assetID, name, description, owner, value);
        return publishAsset(ctx, asset);
    }

    /**
     * Internal method to publish asset to ledger state
     */
    private Asset publishAsset(final Context ctx, final Asset asset) {
        // Serialize asset to JSON
        String assetJSON = genson.serialize(asset);
        
        // Write to ledger state (this is what actually publishes to the blockchain)
        ctx.getStub().putStringState(asset.getAssetID(), assetJSON);
        
        System.out.println("Asset published to ledger: " + asset.getAssetID());
        return asset;
    }

    /**
     * Read an asset from the ledger
     * 
     * @param ctx the transaction context
     * @param assetID the ID of the asset to read
     * @return the asset
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public Asset ReadAsset(final Context ctx, final String assetID) {
        String assetJSON = ctx.getStub().getStringState(assetID);

        if (assetJSON == null || assetJSON.isEmpty()) {
            String errorMessage = String.format("Asset %s does not exist", assetID);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, AssetErrors.ASSET_NOT_FOUND.toString());
        }

        return genson.deserialize(assetJSON, Asset.class);
    }

    /**
     * Check if an asset exists on the ledger
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public boolean AssetExists(final Context ctx, final String assetID) {
        String assetJSON = ctx.getStub().getStringState(assetID);
        return (assetJSON != null && !assetJSON.isEmpty());
    }

    /**
     * Get all assets from the ledger
     * 
     * @param ctx the transaction context
     * @return JSON string containing all assets
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public String GetAllAssets(final Context ctx) {
        ChaincodeStub stub = ctx.getStub();
        List<Asset> queryResults = new ArrayList<>();

        // Get all assets using range query (empty start and end = all keys)
        QueryResultsIterator<KeyValue> results = stub.getStateByRange("", "");

        for (KeyValue result : results) {
            Asset asset = genson.deserialize(result.getStringValue(), Asset.class);
            queryResults.add(asset);
        }

        return genson.serialize(queryResults);
    }

    /**
     * Update an existing asset
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public Asset UpdateAsset(final Context ctx,
                             final String assetID,
                             final String name,
                             final String description,
                             final String owner,
                             final int value) {
        
        if (!AssetExists(ctx, assetID)) {
            String errorMessage = String.format("Asset %s does not exist", assetID);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, AssetErrors.ASSET_NOT_FOUND.toString());
        }

        Asset updatedAsset = new Asset(assetID, name, description, owner, value);
        return publishAsset(ctx, updatedAsset);
    }

    /**
     * Delete an asset from the ledger
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public void DeleteAsset(final Context ctx, final String assetID) {
        if (!AssetExists(ctx, assetID)) {
            String errorMessage = String.format("Asset %s does not exist", assetID);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, AssetErrors.ASSET_NOT_FOUND.toString());
        }

        ctx.getStub().delState(assetID);
        System.out.println("Asset deleted from ledger: " + assetID);
    }
}


