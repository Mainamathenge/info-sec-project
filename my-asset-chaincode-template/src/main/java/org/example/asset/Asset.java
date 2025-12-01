/*
 * SPDX-License-Identifier: Apache-2.0
 */

package org.example.asset;

import org.hyperledger.fabric.contract.annotation.DataType;
import org.hyperledger.fabric.contract.annotation.Property;

import com.owlike.genson.annotation.JsonProperty;

@DataType
public class Asset {
    @Property
    private String assetID;
    
    @Property
    private String name;
    
    @Property
    private String description;
    
    @Property
    private String owner;
    
    @Property
    private int value;

    public Asset() {
        // Default constructor required for deserialization
    }

    public Asset(@JsonProperty("assetID") String assetID, 
                 @JsonProperty("name") String name,
                 @JsonProperty("description") String description,
                 @JsonProperty("owner") String owner,
                 @JsonProperty("value") int value) {
        this.assetID = assetID;
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.value = value;
    }

    // Getters and Setters
    public String getAssetID() {
        return assetID;
    }

    public void setAssetID(String assetID) {
        this.assetID = assetID;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    @Override
    public String toString() {
        return "Asset{" +
                "assetID='" + assetID + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", owner='" + owner + '\'' +
                ", value=" + value +
                '}';
    }
}


