const dotenv = require('dotenv');
const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');
const cors = require("cors");
const makeRoutes = require('./routes');

dotenv.config();

process.env.PATH = process.env.PATH;
process.env.FABRIC_CFG_PATH = process.env.FABRIC_CFG_PATH;
process.env.CORE_PEER_TLS_ENABLED = process.env.CORE_PEER_TLS_ENABLED;
process.env.CORE_PEER_LOCALMSPID = process.env.CORE_PEER_LOCALMSPID;
process.env.CORE_PEER_TLS_ROOTCERT_FILE = process.env.CORE_PEER_TLS_ROOTCERT_FILE;
process.env.CORE_PEER_MSPCONFIGPATH = process.env.CORE_PEER_MSPCONFIGPATH;
process.env.CORE_PEER_ADDRESS = process.env.CORE_PEER_ADDRESS;

const app = express();
const port = 3000;
const ccpPath = path.resolve(__dirname, '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
const caTLSCACerts = caInfo.tlsCACerts.pem;
const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

async function main() {
    try {

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        //cria o adm

        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');

        //cria o gateway

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'admin', discovery: { enabled: true, asLocalhost: true } });

        //cria o usuário

        const userIdentity = await wallet.get('appUser');
        if (!userIdentity) {
            console.log('An identity for the user "appUser" already exists in the wallet');
        
        const adminIdentity = await wallet.get('admin');

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);
        const userenrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });
        const userx509Identity = {
            credentials: {
                certificate: userenrollment.certificate,
                privateKey: userenrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('appUser', userx509Identity);
        console.log('Successfully registered and enrolled admin user "appUser" and imported it into the wallet');
    }

        app.listen(port, () => {
            console.log(`Server listening at http://localhost:${port}`);
        });

        const routes = await makeRoutes();

        app.use(cors());
        app.use(express.json());
        app.use(routes);

        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }

}

main();