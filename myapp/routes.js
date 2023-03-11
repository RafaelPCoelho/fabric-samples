"use-strict";
const express = require('express');
const routes = express.Router();
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require("fs");

const makeRoutes = async () => {
    const gateway = new Gateway();
    const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

    routes.post('/createAsset', async (req, res) => {
        try {

            const { AppraisedValue, Color, ID, Owner, Size } = await req.body;

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic')

            const result = await contract.submitTransaction("CreateAsset", ID, Color, Size, Owner, AppraisedValue);
            return res.status(201).send(result.toString());
        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.get('/readAsset/:ID', async (req, res) => {
        try {

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic');

            const result = await contract.evaluateTransaction("ReadAsset", ID);
            return res.status(200).send(result.toString());

        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.post('/updateAsset/:ID', async (req, res) => {
        try {
            
            const { ID } = await req.params
            const { AppraisedValue, Color, Owner, Size } = await req.body;

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic')

            const result = await contract.submitTransaction("UpdateAsset", ID, Color, Size, Owner, AppraisedValue);
            return res.status(200).send(result.toString());
        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.delete('/deleteAsset/:ID', async (req, res) => {
        try {

            const { ID } = await req.params;

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic');

            const result = await contract.submitTransaction("DeleteAsset", ID);
            res.status(200).send(result.toString());

        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.get('/getAllAssets', async (req, res) => {
        try {

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic');

            const result = await contract.evaluateTransaction("GetAllAssets");
            res.status(200).send(result.toString());

        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.get('/transferAsset', async (req, res) => {
        try {

            const network = await gateway.getNetwork('mychannel');
            const contract = network.getContract('basic');
            
            const {ID, Owner} = await req.body;

            const result = await contract.evaluateTransaction("TransferAsset", ID, Owner);
            res.status(200).send(result.toString());

        } catch (error) {
            console.error(`Failed to evaluate transaction: ${error}`);
            res.status(404).send({ Error: error.responses[0].response.message });
        }
    });

    routes.get('/', async (req, res) => {
        try {
            res.status(200).send('Página inicial');

        } catch (error) {

            console.error(`Failed to enroll admin user "admin": ${error}`);
            res.status(404).send({ Error: "Failed to enroll admin user 'admin'" });

        }
    });

    return routes;
}

module.exports = makeRoutes;