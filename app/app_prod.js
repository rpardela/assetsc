/**
 *
 * ASSET SC TEST DEV
 *
 */

const version = '0.0.1.1000';

const process = require("process");
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const https = require('http');
const fs = require('fs');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

console.log('Asset test ' + version, "Start server");

let configTmp = JSON.parse(fs.readFileSync('./config.json').toString());
let config = configTmp.config;

const assetsc_bc_api = require('./assetsc_bc_api');
assetsc_bc_api.setConfig(configTmp);

process.on('beforeExit', async code => {
    console.log(`Server, exit with code: ${code}`, "Stop server");
})
process.on('exit', async code => {
    console.log(`Server, exit with code: ${code}`, "Stop server");
});
process.on('SIGINT', async code => {
    console.log(`Server, SIGINT exit with code: ${code}`, "Stop server");
    process.exit('SIGINT');
});
process.on('SIGTERM', async code => {
    console.log(`Server, SIGTERM exit with code: ${code}`, "Stop server");
    process.exit('SIGTERM');
});

process.on('uncaughtException', (err) => {
    console.error(err, 'Server, There was an uncaught error');
    console.error('Server, There was an uncaught error', "Stop server");
    process.exit(1) //mandatory (as per the Node.js docs)
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(promise, 'Server, Unhandled rejection promise');
    console.error(reason, 'Server, Unhandled rejection reason');
    console.error('Server, Unhandled rejection', 'Stop server');
    process.exit(1)
})

process.on('warning', (warning) => {
    //console.warn(warning.name);    // Print the warning name
    //console.warn(warning.message); // Print the warning message
    //console.warn(warning.stack);   // Print the stack trace
    console.warning(warning, 'Server, There was an warning');
});

app.use(helmet());
app.disable('x-powered-by');
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));
app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(config.CSPNonceLength).toString("hex").substring(0, config.CSPNonceLength);
    next();
});
app.use(
    helmet.contentSecurityPolicy({
        //useDefaults: true,
        directives: {
            "script-src": ["'self'", "cdn.jsdelivr.net", "code.jquery.com", "cdn-cors.ethers.io", (req, res) => `'nonce-${res.locals.cspNonce}'`],
            "object-src": ["'self'"],
            "img-src": ["'self'", "ipfs.io"]
        },
    })
);
app.use(helmet.hsts({
    // Must be at least 1 year to be approved
    maxAge: 31536000,

    // Must be enabled to be approved
    includeSubDomains: true,
    preload: true
}));

app.use(express.raw({ limit: config.maxFileSize }));

let headersForRequest = [];
app.use((req, res, next) => {

    headersForRequest['x-user-ip'] = req.headers['x-user-ip'];// przekazuję dalej ip usera
    headersForRequest['accept-language'] = req.headers['accept-language'];
    if (!headersForRequest['accept-language']) {
        headersForRequest['accept-language'] = 'en';
    }
    headersForRequest['content-type'] = 'application/x-www-form-urlencoded';

    assetsc_bc_api.headersForRequest = headersForRequest;

    bodyParser.raw({ limit: '1mb' })(req, res, err => {
        if (err) {
            console.error(err, "bodyParser raw");
            let ip_in = req.connection.remoteAddress
                || req.socket.remoteAddress
                || (req.connection.socket ? req.connection.socket.remoteAddress : null);// || req.ip;
            console.error('from IP: ' + ip_in, "bodyParser error RAW");
            return res.sendStatus(400); // Bad request
        }

        next();
    });
});

app.use((req, res, next) => {
    bodyParser.json({ limit: '1mb', extended: true })(req, res, err => {
        if (err) {
            console.error(err, "bodyParser JSON");
            let ip_in = req.connection.remoteAddress
                || req.socket.remoteAddress
                || (req.connection.socket ? req.connection.socket.remoteAddress : null);// || req.ip;
            console.error('from IP: ' + ip_in, "bodyParser error JSON");
            return res.sendStatus(400); // Bad request
        }

        next();
    });
});
app.use((req, res, next) => {
    bodyParser.urlencoded({ limit: '1mb', extended: false, parameterLimit: 10 })(req, res, err => {
        if (err) {
            console.error(err, "bodyParser urlencoded");
            let ip_in = req.connection.remoteAddress
                || req.socket.remoteAddress
                || (req.connection.socket ? req.connection.socket.remoteAddress : null);// || req.ip;
            console.error('from IP: ' + ip_in, "bodyParser error urlencoded");
            return res.sendStatus(400); // Bad request
        }

        next();
    });
});

const allowedMethods = ['GET'];

app.use((req, res, next) => {
    if (!allowedMethods.includes(req.method)) {
        console.warning('Method Not Allowed: ' + req.method, 'request');
        res.sendStatus(405);
        return res.end();
    }
    return next()
})

app.use(express.static("public"));

// Add headers
app.use(function (req, res, next) {

    // Request methods you wish to allow
    //res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(compression({ filter: shouldCompress }));

function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        // don't compress responses with this request header
        return false
    }

    // fallback to standard filter function
    return compression.filter(req, res)
}

start();

async function start() {
    await assetsc_bc_api.init();
}


app.get("/", function (req, res) {
    let pageToSend = '';

    pageToSend = fs.readFileSync('./public/main.html').toString();
    pageToSend = pageToSend.replace("[$NONCE$]", res.locals.cspNonce);
    res.send(pageToSend);
});

/**
 * Send data of all assets
 */
app.get("/api/assets", async function (req, res) {

    let finish = false;
    let index = 0;
    let assets = [];

    do {
        await assetsc_bc_api.getAssetsByIndex(index)
            .then(async (asset) => {
                let assetDesc = { id: asset.toNumber() };
                let detail = await assetsc_bc_api.getAsset(asset)
                assetDesc.detail = { name: detail.name, owner: detail.owner, maxShares: detail.maxShares.toNumber(), fixPricePerShare: detail.fixPricePerShare.toNumber() };
                assetDesc.shares = [];
                let sharesIn = await assetsc_bc_api.getSharesPerAssets(asset);
                sharesIn.map((item) => {
                    let data = { shares: item.shares.toNumber(), stakeholder: item.stakeholder }
                    assetDesc.shares.push(data);
                });
                let freeShares = await assetsc_bc_api.calcFreeShares(asset);
                assetDesc.freeShares = freeShares.toNumber();
                assets.push(assetDesc);
            })
            .catch(err => {
                console.error(err, 'getAssetsByIndex error');
                finish = true;
            })
        index++;
    } while (!finish);

    let ret = assets.sort((a, b) => {
        if (a.detail.name < b.detail.name) {
            return -1;
        }
        if (b.detail.name < a.detail.name) {
            return 1;
        }
        return 0;
    });

    res.json(ret);
});


app.use(function (req, res, next) {

    let ip = req.headers['x-user-ip']
        || req.connection.remoteAddress
        || req.socket.remoteAddress
        || (req.connection.socket ? req.connection.socket.remoteAddress : null);// || req.ip;

    console.warn('No API: ' + req.method + ': ' + req.path + ', from: ' + ip, '404');

    res.sendStatus(404);
    return res.end();
});


https.createServer({
}, app).listen(config.serverPort, config.serverIP);
