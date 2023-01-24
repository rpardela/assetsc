An example of a smart contract that allows the sale of shares for defined assets.

Software runs on Polygon Mumbai and Node.js platform. This is not NFT!

# <br>MOTIVATION

Sometimes someone asks me what drove me to prepare such a demo, what was my motivation?

Of course, I know that the problem of tokenization of assets can and even should be implemented in other ways, for example, using ERC standards, but this demo was created for the needs of a specific client who asked me to prepare a concept that does not use any available standards.
And so this project was created :)

# <br>I. REQUIREMENTS

The contract must:

- allow sell assets to multiple parties
- allow anyone to add an asset with a fixed "price",
- users can "buy" shares at a fixed price per share
- when the purchase is initiated, the owner of the asset receives the funds, while the buyer receives the shares.
- The shares are stored in the contract and cannot be further transferred.

# <br>II. SMARTCONTRACT

The /sc directory contains the source code of smartcontract.
Smartcontract is available at 0x441FB36008dc81491F71fEF80cbBCE5A39BE95DF.

Methods that implement the defined requirements are available. I have also implemented modifiers and other security features in accordance with good practices and design patterns. There is a getAssetsList function in the smartcontract, which returns an array of assets/objects added to the smartcontract. This is mainly as an example of the potential possibilities, because with a large amount of data the function will not execute.

I mainly focused on ensuring that the smartcontract works properly and that it is handled correctly on the backend and frontend side.

# <br>III. SERVER

The /app directory contains software running under Nodejs.
The software runs on http://localhost:4333, and it is possible to change the configuration in the config.js file.

On the backend side, one endpoint API is implemented, which is used to retrieve the list of assets (objects) added to smartcontract. The backend also includes a library that allows access to all smartcontract methods - assetsc_bc_api.js

On the frontend side, functions are defined that require a connection to the Metamask portfolio. In addition, as an example, there are functions in the frontend part that allow you to realize the same functionality that the endpoint API implements (see getAssetsList()).

I have implemented error handling and data validation to a limited extent. Detailed error messages, if they occur, can be found in the console.

The user interface is not sophisticated :)

This, of course, is not the only possible way to implement the defined requirements.

# <br>IV. Working with the application

1. start the server
2. go to the browser to the address httpt:/localhost:4333
3. click "Connect wallet" button and connect Metamask wallet (use polygon mumbai network)
4. wait for the list of previously added assets/objects to load
5. to add a new asset/object fill in the fields in the Add asset section and click the "Add asset" button. If the asset was added refresh the list below, if the asset was not added check the console for error details
6. to buy shares in an asset fill in the fields in the Buy shares section and click the "Buy shares" button. Continue following the same steps as for Add asset.
