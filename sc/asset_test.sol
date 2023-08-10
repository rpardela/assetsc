// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

contract AssetTest {
    // Contract owner address
    address private owner;

    // shares per asset
    mapping(uint256 => AssetShare[]) private sharesPerAssets;
    //asset by assetID
    mapping(uint256 => Asset) private assets;
    // array of asset ids
    uint256[] private assetsList;

    // Asset record definition
    struct Asset {
        string name; //asset name
        address owner; //asset owner address
        uint256 maxShares;
        uint256 fixPricePerShare;
    }

    //Asset share record  definition
    struct AssetShare {
        uint256 shares;
        address stakeholder;
    }

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "No token ownership");
        _;
    }

    modifier onlyAssetOwner(uint256 _assetID) {
        require(msg.sender == assets[_assetID].owner, "No asset ownership");
        _;
    }

    modifier assetExists(uint256 _assetID) {
        require(assets[_assetID].owner != address(0), "Asset not exists");
        _;
    }

    /**
     * Add new asset. Asset's owner = msg.sender
     * Req: allow anyone to set up an object with a fixed "price"
     */
    function addAsset(
        string memory _name,
        uint256 _assetID,
        uint256 _maxShares,
        uint256 _fixPricePerShare
    ) public {
        require(!(assets[_assetID].maxShares > 0), "Asset exists");

        Asset memory newAsset = Asset({
            owner: msg.sender,
            name: _name,
            maxShares: _maxShares,
            fixPricePerShare: _fixPricePerShare
        });

        assets[_assetID] = newAsset;
        assetsList.push(_assetID);
    }

    /**
     * Get money from buyer (msg.sender) to asset owner
     * Req: other users can then "purchase" stakes in
     * Req: the owner of the object receives funds
     * Req: buyer gets stakes
     */
    function buyShares(
        uint256 _assetID,
        uint256 _shares
    ) public payable assetExists(_assetID) returns (bytes32) {
        require(msg.value > 0, "Value is 0");
        require(_shares > 0, "Shares to buy is 0");
        uint256 calcValue = assets[_assetID].fixPricePerShare * _shares;
        require(msg.value == calcValue, "Wrong value");
        require(calcFreeShares(_assetID) >= _shares, "No required shares");

        AssetShare memory newAssetShare = AssetShare({
            shares: _shares,
            stakeholder: msg.sender
        });

        (bool success, ) = payable(assets[_assetID].owner).call{
            value: msg.value
        }("");

        require(success, "Failed to send Ether");

        sharesPerAssets[_assetID].push(newAssetShare);

        return "TRN_ACCEPTED";
    }

    /**
     * Get free (uncovered) shares for asset
     */
    function calcFreeShares(
        uint256 _assetID
    ) public view assetExists(_assetID) returns (uint256) {
        uint256 allShares = 0;

        for (uint256 i = 0; i < sharesPerAssets[_assetID].length; i++) {
            allShares += sharesPerAssets[_assetID][i].shares;
        }
        if ((assets[_assetID].maxShares - allShares) <= 0) {
            return 0;
        } else {
            return assets[_assetID].maxShares - allShares;
        }
    }

    /**
     * Get list of assets
     */
    function getAssetsList() public view returns (uint256[] memory) {
        return assetsList;
    }

    /**
     * Get asset from list (by index0)
     */
    function getAssetsByIndex(uint256 index) public view returns (uint256) {
        require(index < assetsList.length, "Index out of bounds");
        return assetsList[index];
    }

    /**
     * Get asset's record
     */
    function getAsset(
        uint256 _assetID
    ) public view assetExists(_assetID) returns (Asset memory) {
        return assets[_assetID];
    }

    /**
     * Get asset's share
     */
    function getSharesPerAssets(
        uint256 _assetID
    ) public view assetExists(_assetID) returns (AssetShare[] memory) {
        return sharesPerAssets[_assetID];
    }

    /**
     * Get balance of contract
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * Get address of owner of contract
     */
    function getContractOwner() public view returns (address) {
        return owner;
    }

    /**
     * Return version of smartcontract
     */
    function getVersion() external pure returns (string memory) {
        return "0.0.8";
    }
}
