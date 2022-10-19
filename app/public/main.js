let provider;
let signer;
let assetContract;
let walletAddress;


const startMain = async () => {
    document.getElementById('connectButton').onclick = connectToWallet;
    document.getElementById('refreshButton').onclick = refreshTable;

    document.getElementById('addAssetButton').onclick = async () => {
        await addAsset(
            document.getElementById('assetName').value,
            document.getElementById('assetID').value,
            document.getElementById('assetMaxShares').value,
            document.getElementById('assetPricePerShare').value
        );
    };

    document.getElementById('buyAssetButton').onclick = async () => {
        await buyShares(
            document.getElementById('assetIDBuy').value,
            document.getElementById('assetSharesBuy').value,
            document.getElementById('assetValueBuy').value
        );
    };
}

const connectToWallet = async () => {
    $('#spinnerGlobal').show();
    provider = new ethers.providers.Web3Provider(window.ethereum)

    // MetaMask requires requesting permission to connect users accounts
    await provider.send("eth_requestAccounts", []);

    // The MetaMask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    signer = await provider.getSigner();
    walletAddress = await signer.getAddress();

    document.getElementById('walletAddress').innerHTML = walletAddress;

    // The Contract object
    assetContract = new ethers.Contract('0x441FB36008dc81491F71fEF80cbBCE5A39BE95DF', getABI(), provider).connect(signer);

    //show table with assets
    await refreshTable();

    $('#spinnerGlobal').hide();
}

/**
 * Show table with assets
 */
const refreshTable = async () => {
    $('#spinnerGlobal').show();
    await getAssets()
        .then((res) => {
            //render table element
            showAssetsList(res);
        })
        .catch(err => {
            console.error(err, "addAsset wait");
        })
    $('#spinnerGlobal').hide();
}

/**
 * Add new asset by conected metamask account
 * @param {*} _name 
 * @param {*} _assetID 
 * @param {*} _maxShares 
 * @param {*} _pricePerShare 
 */
const addAsset = async (_name, _assetID, _maxShares, _pricePerShare) => {
    $('#spinnerGlobal').show();
    let gasPrice = Math.round(await provider.getGasPrice()); //ethers.utils.parseUnits(Math.round(await this.bcHttpProvider.getGasPrice() * config.chain.gasPriceRate).toString(), "gwei");

    let estGas = 0;
    await assetContract.estimateGas.addAsset(_name, _assetID, _maxShares, _pricePerShare)
        .then(async (res) => {
            estGas = res;
            let gas = Math.round(estGas * 1.3);
            await assetContract.addAsset(_name, _assetID, _maxShares, _pricePerShare,
                {
                    gasPrice: gasPrice,
                    gasLimit: gas,
                })
                .then(async (result) => {
                    await result.wait(1)
                        .then((res) => {
                            $('#spinnerGlobal').hide();
                            alert('Asset added');
                            return ({ retcode: 'OK' });
                        })
                        .catch(err => {
                            console.error(err, "addAsset wait");
                            $('#spinnerGlobal').hide();
                            alert('Error: Asset not added');
                            return ({ error: err, retcode: 'ERROR' });
                        })
                })
                .catch(err => {
                    console.error(err, "addAsset");
                    $('#spinnerGlobal').hide();
                    alert('Error: Asset not added');
                    return ({ error: err, retcode: 'ERROR' });
                })
        })
        .catch(err => {
            console.error(err, "estimate addAsset error");
            $('#spinnerGlobal').hide();
            alert('Error: Asset not added');
            return ({ error: err, retcode: 'ERROR' });
        })
}

/**
 * Buy asset shares by connected metemask account
 * @param {*} _assetID 
 * @param {*} _shares 
 * @param {*} _value 
 */
const buyShares = async (_assetID, _shares, _value) => {
    $('#spinnerGlobal').show();
    let gasPrice = Math.round(await provider.getGasPrice()); //ethers.utils.parseUnits(Math.round(await this.bcHttpProvider.getGasPrice() * config.chain.gasPriceRate).toString(), "gwei");
    let estGas = 0;
    await assetContract.estimateGas.buyShares(_assetID, _shares, {
        value: _value
    })
        .then(async (res) => {
            estGas = res;
            let gas = Math.round(estGas * 1.3);
            await assetContract.buyShares(_assetID, _shares,
                {
                    gasPrice: gasPrice,
                    gasLimit: gas,
                    value: _value
                })
                .then(async (result) => {
                    await result.wait(1)
                        .then((res) => {
                            $('#spinnerGlobal').hide();
                            alert('Shares of asset purchased');
                            return ({ retcode: 'OK' });
                        })
                        .catch(err => {
                            console.error(err, "buyShares wait");
                            $('#spinnerGlobal').hide();
                            alert('Error: Shares of asset not purchased');
                            return ({ error: err, retcode: 'ERROR' });
                        })
                })
                .catch(err => {
                    console.error(err, "buyShares");
                    $('#spinnerGlobal').hide();
                    alert('Error: Shares of asset not purchased');
                    return ({ error: err, retcode: 'ERROR' });
                })
        })
        .catch(err => {
            console.error(err, "estimate buyShares error");
            $('#spinnerGlobal').hide();
            alert('Error: Shares of asset not purchased');
            return ({ error: err, retcode: 'ERROR' });
        })
}

/**
 * Get assets list from server
 * @returns 
 */
const getAssets = () => {
    return new Promise((resolve, reject) => {
        $.get("/api/assets",)
            .done(async function (res) {
                resolve(res);
            })
            .fail(function (err) {
                reject(err);
            });
    });
}

/**
 * Get asets list directly from Blockchain (as a sample)
 * @returns 
 */
const getAssetsList = async () => {
    let assets = [];
    await assetContract.getAssetsList()
        .then(async (result) => {
            await Promise.all(result.map(async (asset) => {
                let assetDesc = { id: asset.toNumber() };
                assetDesc.detail = await getAsset(asset);
                assetDesc.shares = await getSharesPerAssets(asset);
                assetDesc.freeShares = await calcFreeShares(asset);
                assets.push(assetDesc);
            }));
        });

    return (assets.sort((a, b) => {
        if (a.detail.name < b.detail.name) {
            return -1;
        }
        if (b.detail.name < a.detail.name) {
            return 1;
        }
        return 0;
    }));
}

/**
 * Get asset data
 * @param {*} _assetID 
 * @returns 
 */
const getAsset = async (_assetID) => {
    await assetContract.getAsset(_assetID)
        .then((result) => {
            return (result);
        })
        .catch(err => {
            console.error(err, "getAsset");
            throw new Error(err);
        })
};

/**
 * Get information about stakeholders of asset
 * @param {*} _assetID 
 * @returns 
 */
const getSharesPerAssets = async (_assetID) => {
    await assetContract.getSharesPerAssets(_assetID)
        .then((result) => {
            return (result);
        })
        .catch(err => {
            console.error(err, "getSharesPerAssets");
            throw new Error(err);
        })
};

/**
 * Get information about free shares of asset (possible to buy)
 * @param {*} _assetID 
 * @returns 
 */
const calcFreeShares = async (_assetID) => {
    await assetContract.calcFreeShares(_assetID)
        .then((result) => {
            return (result);
        })
        .catch(err => {
            console.error(err, "calcFreeShares");
            throw new Error(err);
        })
};

/**
 * Render table element with assets list
 * @param {*} list 
 * @returns 
 */
const showAssetsList = (list) => {
    if (!list.length) return;

    let element = document.getElementById('assetsList');
    element.innerHTML = '';

    let table = document.createElement('table');
    //Add header of table
    let row = document.createElement('tr');
    let h1 = document.createElement('th');
    h1.appendChild(document.createTextNode('Name'));
    h1.style.border = '1px solid black';
    row.appendChild(h1);
    let h2 = document.createElement('th');
    h2.appendChild(document.createTextNode('ID'));
    h2.style.border = '1px solid black';
    row.appendChild(h2);
    let h3 = document.createElement('th');
    h3.appendChild(document.createTextNode('Owner'));
    h3.style.border = '1px solid black';
    row.appendChild(h3);
    let h4 = document.createElement('th');
    h4.appendChild(document.createTextNode('Max shares'));
    h4.style.border = '1px solid black';
    row.appendChild(h4);
    let h5 = document.createElement('th');
    h5.appendChild(document.createTextNode('Price per share'));
    h5.style.border = '1px solid black';
    row.appendChild(h5);
    let h6 = document.createElement('th');
    h6.appendChild(document.createTextNode('Free shares'));
    h6.style.border = '1px solid black';
    row.appendChild(h6);
    let h7 = document.createElement('th');
    h7.appendChild(document.createTextNode('Stakeholders'));
    h7.style.border = '1px solid black';
    row.appendChild(h7);
    table.appendChild(row);

    //Add rows with asstes
    list.map((assetData) => {
        let row = document.createElement('tr');
        let f1 = document.createElement('td');
        f1.appendChild(document.createTextNode(assetData.detail.name));
        f1.style.border = '1px solid black';
        row.appendChild(f1);
        let f2 = document.createElement('td');
        f2.appendChild(document.createTextNode(assetData.id));
        f2.style.border = '1px solid black';
        row.appendChild(f2);
        let f3 = document.createElement('td');
        f3.appendChild(document.createTextNode(assetData.detail.owner));
        f3.style.border = '1px solid black';
        row.appendChild(f3);
        let f4 = document.createElement('td');
        f4.appendChild(document.createTextNode(assetData.detail.maxShares));
        f4.style.border = '1px solid black';
        row.appendChild(f4);
        let f5 = document.createElement('td');
        f5.appendChild(document.createTextNode(assetData.detail.fixPricePerShare));
        f5.style.border = '1px solid black';
        row.appendChild(f5);
        let f6 = document.createElement('td');
        f6.appendChild(document.createTextNode(assetData.freeShares));
        f6.style.border = '1px solid black';
        row.appendChild(f6);
        let f7 = document.createElement('td');
        let owners = '';
        //Add list of stakeholders
        assetData.shares.map((owner) => {
            //owners += owner.stakeholder + ' (' + owner.shares.toNumber() + ')\u000a'; //version not for API call data
            owners += owner.stakeholder + ' (' + owner.shares + ')\u000a';
        })

        f7.appendChild(document.createTextNode(owners));
        f7.style = 'white-space: pre';
        f7.style.border = '1px solid black';
        row.appendChild(f7);
        table.appendChild(row);
    })
    element.appendChild(table);
}

/**
 * Return ABI definition for smartcontract
 * @returns 
 */
const getABI = () => {
    return [
        {
            "inputs": [],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_name",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "_assetID",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_maxShares",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_fixPricePerShare",
                    "type": "uint256"
                }
            ],
            "name": "addAsset",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_assetID",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "_shares",
                    "type": "uint256"
                }
            ],
            "name": "buyShares",
            "outputs": [
                {
                    "internalType": "bytes32",
                    "name": "",
                    "type": "bytes32"
                }
            ],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_assetID",
                    "type": "uint256"
                }
            ],
            "name": "calcFreeShares",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_assetID",
                    "type": "uint256"
                }
            ],
            "name": "getAsset",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "string",
                            "name": "name",
                            "type": "string"
                        },
                        {
                            "internalType": "address",
                            "name": "owner",
                            "type": "address"
                        },
                        {
                            "internalType": "uint256",
                            "name": "maxShares",
                            "type": "uint256"
                        },
                        {
                            "internalType": "uint256",
                            "name": "fixPricePerShare",
                            "type": "uint256"
                        }
                    ],
                    "internalType": "struct AssetTest.Asset",
                    "name": "",
                    "type": "tuple"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getAssetsByIndex",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getAssetsList",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getBalance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getContractOwner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "_assetID",
                    "type": "uint256"
                }
            ],
            "name": "getSharesPerAssets",
            "outputs": [
                {
                    "components": [
                        {
                            "internalType": "uint256",
                            "name": "shares",
                            "type": "uint256"
                        },
                        {
                            "internalType": "address",
                            "name": "stakeholder",
                            "type": "address"
                        }
                    ],
                    "internalType": "struct AssetTest.AssetShare[]",
                    "name": "",
                    "type": "tuple[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "getVersion",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "pure",
            "type": "function"
        }
    ]
}

Window.main = {
    startMain: startMain,
}
