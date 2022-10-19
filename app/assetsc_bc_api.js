const version = '0.0.1';

const ethers = require('ethers');
const fs = require("fs");

module.exports = {
    headersForRequest: [],
    bcAddress: '',
    bcHttpProvider: null,
    privateKey: '',
    contractABI: '',
    contractAddress: '',
    contract: null,
    contractVersion: '',
    config: '',
    setConfig: function (configGlobal) {
        this.config = configGlobal.config;
        this.bcAddress = this.config.chain.bcAddressTest;
        this.contractAddress = this.config.token.contractAddressTest;
        this.contractABI = this.config.token.pathToABITest;
    },
    init: async function () {
        console.log(this.bcAddress, "Blockchain");
        this.contractABI = JSON.parse(fs.readFileSync(this.contractABI).toString());
        this.bcHttpProvider = new ethers.providers.JsonRpcProvider(this.bcAddress);

        this.bcHttpProvider.getBlockNumber().then((result) => {
            console.log(result, "Current block number");
        });

        this.contract = new ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.bcHttpProvider
        );
        this.getContractVersion();
    },
    addAsset: async function (_name, _assetID, _maxShares, _pricePerShare) {
        let function_result;
        let gasPrice = Math.round(await this.bcHttpProvider.getGasPrice() * this.gasPriceRate); //ethers.utils.parseUnits(Math.round(await this.bcHttpProvider.getGasPrice() * config.chain.gasPriceRate).toString(), "gwei");
        let estGas = 0;
        await this.contract.estimateGas.addAsset(_name, _assetID, _maxShares, _pricePerShare)
            .then(async (res) => {
                estGas = res;
                let gas = Math.round(estGas * this.gasLimitRate);
                await this.contract.addAsset(_name, _assetID, _maxShares, _pricePerShare,
                    {
                        gasPrice: gasPrice,
                        gasLimit: gas,
                    })
                    .then(async (result) => {
                        await result.wait(1)
                            .then((res) => {
                                function_result = { retcode: 'OK' };
                            })
                            .catch(err => {
                                console.error(err, "addAsset wait");
                                //reject(err.reason);
                                throw new Error({ error: err, retcode: 'ERROR' });
                            })
                    })
                    .catch(err => {
                        console.error(err, "addAsset");
                        throw new Error({ error: err, retcode: 'ERROR' });
                    })
            })
            .catch(err => {
                console.error(err, "estimate addAsset error");
                throw new Error({ error: err, retcode: 'ERROR' });
            })

        return function_result;
    },
    getAssetsList: function () {
        let assets = [];
        return new Promise((resolve, reject) => {
            this.contract.getAssetsList()
                .then((result) => {
                    result.map(async (asset) => {
                        let assetDesc = { asset: await this.getAsset(asset) };
                        assetDesc.shares = this.getSharesPerAssets(asset);
                        assetDesc.freeShares = this.calcFreeShares(asset);
                        assets.push(assetDesc);
                    });
                    resolve(assets);
                })
                .catch(err => {
                    console.error(err, "getAssetsList");
                    reject(err);
                })
        });
    },
    getAssetsByIndex: function (_index) {
        return new Promise((resolve, reject) => {
            this.contract.getAssetsByIndex(_index)
                .then((result) => {
                    resolve(result);
                })
                .catch(err => {
                    console.error(err, "getAssetsByIndex");
                    reject(err);
                })
        });
    },
    getAsset: function (_assetID) {
        return new Promise((resolve, reject) => {
            this.contract.getAsset(_assetID)
                .then((result) => {
                    resolve(result);
                })
                .catch(err => {
                    console.error(err, "getAsset");
                    reject(err);
                })
        });
    },
    getSharesPerAssets: function (_assetID) {
        return new Promise((resolve, reject) => {
            this.contract.getSharesPerAssets(_assetID)
                .then((result) => {
                    resolve(result);
                })
                .catch(err => {
                    console.error(err, "getSharesPerAssets");
                    reject(err);
                })
        });
    },
    calcFreeShares: function (_assetID) {
        return new Promise((resolve, reject) => {
            this.contract.calcFreeShares(_assetID)
                .then((result) => {
                    resolve(result);
                })
                .catch(err => {
                    console.error(err, "calcFreeShares");
                    reject(err);
                })
        });
    },
    getContractVersion: function () {
        return new Promise((resolve, reject) => {
            this.contract.getVersion()
                .then((result) => {
                    console.log(result, 'ASSET smartcontract version')
                    resolve(result);
                })
                .catch(err => {
                    console.error(err, "ASSET smartcontract version");
                    reject(err);
                })
        });
    },
    getVersion: function () {
        return version;
    },
};
