/*
 * SPDX-License-Identifier: Apache-2.0
 */

package org.example.asset;

import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;
import com.owlike.genson.annotation.JsonProperty;
import java.util.Objects;

@DataType
public class SoftwareRelease {

    @Property
    private String packageId;

    @Property
    private String version;

    @Property
    private String fileHash;

    @Property
    private String status; // "ACTIVE" or "DISCONTINUED"

    @Property
    private String publisher;

    public SoftwareRelease() {
        // Default constructor required for deserialization
    }

    public SoftwareRelease(@JsonProperty("packageId") String packageId,
                           @JsonProperty("version") String version,
                           @JsonProperty("fileHash") String fileHash,
                           @JsonProperty("status") String status,
                           @JsonProperty("publisher") String publisher) {
        this.packageId = packageId;
        this.version = version;
        this.fileHash = fileHash;
        this.status = status;
        this.publisher = publisher;
    }

    // Getters and Setters
    public String getPackageId() {
        return packageId;
    }

    public void setPackageId(String packageId) {
        this.packageId = packageId;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getFileHash() {
        return fileHash;
    }

    public void setFileHash(String fileHash) {
        this.fileHash = fileHash;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPublisher() {
        return publisher;
    }

    public void setPublisher(String publisher) {
        this.publisher = publisher;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SoftwareRelease that = (SoftwareRelease) o;
        return Objects.equals(packageId, that.packageId) &&
                Objects.equals(version, that.version) &&
                Objects.equals(fileHash, that.fileHash) &&
                Objects.equals(status, that.status) &&
                Objects.equals(publisher, that.publisher);
    }

    @Override
    public int hashCode() {
        return Objects.hash(packageId, version, fileHash, status, publisher);
    }

    @Override
    public String toString() {
        return "SoftwareRelease{" +
                "packageId='" + packageId + '\'' +
                ", version='" + version + '\'' +
                ", fileHash='" + fileHash + '\'' +
                ", status='" + status + '\'' +
                ", publisher='" + publisher + '\'' +
                '}';
    }
}
