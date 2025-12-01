/*
 * SPDX-License-Identifier: Apache-2.0
 */

package org.example.asset;

import org.hyperledger.fabric.contract.Context;
import org.hyperledger.fabric.contract.ContractInterface;
import org.hyperledger.fabric.contract.annotation.Contract;
import org.hyperledger.fabric.contract.annotation.Default;
import org.hyperledger.fabric.contract.annotation.Info;
import org.hyperledger.fabric.contract.annotation.License;
import org.hyperledger.fabric.contract.annotation.Transaction;
import org.hyperledger.fabric.shim.ChaincodeException;
import org.hyperledger.fabric.shim.ChaincodeStub;
import com.owlike.genson.Genson;

@Contract(
    name = "SoftwareReleaseContract",
    info = @Info(
        title = "Software Release Tracking Contract",
        description = "Contract for tracking software releases",
        version = "1.0.0",
        license = @License(
            name = "Apache 2.0 License",
            url = "http://www.apache.org/licenses/LICENSE-2.0.html"),
        contact = @org.hyperledger.fabric.contract.annotation.Contact(
            email = "admin@example.com",
            name = "Software Release Admin")))
public class SoftwareReleaseContract implements ContractInterface {

    private final Genson genson = new Genson();

    private enum ReleaseErrors {
        RELEASE_NOT_FOUND,
        RELEASE_ALREADY_EXISTS,
        INVALID_HASH,
        RELEASE_DISCONTINUED
    }

    /**
     * Publish a new software release
     *
     * @param ctx the transaction context
     * @param packageId the package identifier (e.g., "com.example.app")
     * @param version the version string (e.g., "1.0.0")
     * @param fileHash the SHA-256 hash of the release artifact
     * @return the published release
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public SoftwareRelease PublishRelease(final Context ctx,
                                        final String packageId,
                                        final String version,
                                        final String fileHash) {
        
        String key = createKey(ctx, packageId, version);

        if (ReleaseExists(ctx, key)) {
            String errorMessage = String.format("Release %s version %s already exists", packageId, version);
            System.out.println(errorMessage);
            throw new ChaincodeException(errorMessage, ReleaseErrors.RELEASE_ALREADY_EXISTS.toString());
        }

        // Get the publisher's MSP ID
        String publisher = ctx.getClientIdentity().getMSPID();

        SoftwareRelease release = new SoftwareRelease(packageId, version, fileHash, "ACTIVE", publisher);
        String releaseJSON = genson.serialize(release);
        
        ctx.getStub().putStringState(key, releaseJSON);
        
        System.out.println("Release published: " + key);
        return release;
    }

    /**
     * Discontinue a software release
     *
     * @param ctx the transaction context
     * @param packageId the package identifier
     * @param version the version string
     * @return the updated release
     */
    @Transaction(intent = Transaction.TYPE.SUBMIT)
    public SoftwareRelease DiscontinueRelease(final Context ctx,
                                            final String packageId,
                                            final String version) {
        
        String key = createKey(ctx, packageId, version);
        SoftwareRelease release = getRelease(ctx, key);

        release.setStatus("DISCONTINUED");
        String releaseJSON = genson.serialize(release);
        
        ctx.getStub().putStringState(key, releaseJSON);
        
        System.out.println("Release discontinued: " + key);
        return release;
    }

    /**
     * Validate a software release
     *
     * @param ctx the transaction context
     * @param packageId the package identifier
     * @param version the version string
     * @param fileHash the hash to validate
     * @return true if valid and active, false otherwise
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public boolean ValidateRelease(final Context ctx,
                                 final String packageId,
                                 final String version,
                                 final String fileHash) {
        
        String key = createKey(ctx, packageId, version);
        
        if (!ReleaseExists(ctx, key)) {
            return false;
        }

        SoftwareRelease release = getRelease(ctx, key);

        if (!release.getFileHash().equals(fileHash)) {
            return false;
        }

        if ("DISCONTINUED".equals(release.getStatus())) {
            return false; // Or throw exception if preferred, but boolean is simpler for validation check
        }

        return true;
    }

    /**
     * Get release details
     *
     * @param ctx the transaction context
     * @param packageId the package identifier
     * @param version the version string
     * @return the release object
     */
    @Transaction(intent = Transaction.TYPE.EVALUATE)
    public SoftwareRelease GetRelease(final Context ctx,
                                    final String packageId,
                                    final String version) {
        String key = createKey(ctx, packageId, version);
        return getRelease(ctx, key);
    }

    // Helper methods

    private String createKey(Context ctx, String packageId, String version) {
        return packageId + ":" + version;
    }

    private boolean ReleaseExists(Context ctx, String key) {
        String releaseJSON = ctx.getStub().getStringState(key);
        return (releaseJSON != null && !releaseJSON.isEmpty());
    }

    private SoftwareRelease getRelease(Context ctx, String key) {
        String releaseJSON = ctx.getStub().getStringState(key);
        if (releaseJSON == null || releaseJSON.isEmpty()) {
            String errorMessage = String.format("Release not found for key: %s", key);
            throw new ChaincodeException(errorMessage, ReleaseErrors.RELEASE_NOT_FOUND.toString());
        }
        return genson.deserialize(releaseJSON, SoftwareRelease.class);
    }
}
