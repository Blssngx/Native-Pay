import express from 'express';
import { createAuthenticatedClient } from '@interledger/open-payments';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const app = express();
app.use(express.json());

// Temporary in-memory cache for storing grants
const grantCache = new Map();

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load wallet configurations from wallets.json
let walletsConfig;
try {
    const walletsPath = path.join(__dirname, 'wallets.json');
    const walletsData = fs.readFileSync(walletsPath, 'utf-8');
    walletsConfig = JSON.parse(walletsData);
    console.log('Wallet configurations loaded successfully.');
} catch (error) {
    console.error('Error loading wallets.json:', error);
    process.exit(1); // Exit the application if wallets cannot be loaded
}

// Initialize the Open Payments client once to reuse across requests
let client; // We'll initialize this per wallet, so remove the global client
// Removed the global client initialization

// GET /initiate-transaction
app.get('/initiate-transaction', async (req, res) => {
    const { name, amount = '1000' } = req.query; // Extract 'name' and 'amount' from query params

    if (!name) {
        return res.status(400).json({ error: 'Missing "name" query parameter' });
    }

    // Retrieve wallet configuration by name
    const walletConfig = walletsConfig[name];

    if (!walletConfig) {
        return res.status(404).json({ error: `Wallet configuration for name "${name}" not found` });
    }

    try {
        const { walletAddressUrl, privateKey, keyId } = walletConfig;

        const client = await createAuthenticatedClient({
            walletAddressUrl,
            privateKey: Buffer.from(privateKey, 'base64'),
            keyId,
        });

        const payeeWalletAddress = await client.walletAddress.get({
            url: walletAddressUrl,
        });

        const payerWalletAddress = await client.walletAddress.get({
            url: process.env.WALLET_ADDRESS,
        });

        console.log('Payee Wallet Address:', payeeWalletAddress);

        // Request grant for incoming payments
        const incomingPaymentGrant = await client.grant.request(
            {
                url: payeeWalletAddress.authServer,
            },
            {
                access_token: {
                    access: [
                        {
                            type: "incoming-payment",
                            actions: ["list", "read", "read-all", "complete", "create"],
                        },
                    ],
                },
            },
        );

        // Create an incoming payment
        const incomingPayment = await client.incomingPayment.create(
            {
                url: payeeWalletAddress.resourceServer,
                accessToken: incomingPaymentGrant.access_token.value,
            },
            {
                walletAddress: payeeWalletAddress.id,
                incomingAmount: {
                    assetCode: payeeWalletAddress.assetCode,
                    assetScale: payeeWalletAddress.assetScale,
                    value: amount,
                },
            },
        );

        // Request grant for creating a quote
        const quoteGrant = await client.grant.request(
            {
                url: payerWalletAddress.authServer,
            },
            {
                access_token: {
                    access: [
                        {
                            type: "quote",
                            actions: ["create", "read"],
                        },
                    ],
                },
            },
        );

        // Create a quote for the outgoing payment
        const outgoingPaymentQuote = await client.quote.create(
            {
                url: payerWalletAddress.resourceServer,
                accessToken: quoteGrant.access_token.value,
            },
            {
                method: "ilp",
                walletAddress: payerWalletAddress.id,
                receiver: incomingPayment.id,
            },
        );

        // Generate a unique identifier for the grant to be used in the callback
        const grantId = randomUUID();

        // Request grant for outgoing payments with redirect URI containing the grantId
        const outgoingPaymentGrant = await client.grant.request(
            {
                url: payerWalletAddress.authServer,
            },
            {
                access_token: {
                    access: [
                        {
                            identifier: payerWalletAddress.id,
                            type: "outgoing-payment",
                            actions: ["read", "create"],
                            limits: {
                                debitAmount: {
                                    value: outgoingPaymentQuote.debitAmount.value,
                                    assetCode: outgoingPaymentQuote.debitAmount.assetCode,
                                    assetScale: outgoingPaymentQuote.debitAmount.assetScale,
                                },
                            },
                        },
                    ],
                },
                interact: {
                    start: ["redirect"],
                    finish: {
                        method: "redirect",
                        // Include the grantId as a query parameter to identify the grant in the callback
                        uri: `http://localhost:${process.env.PORT || 8000}/callback?grantId=${grantId}`,
                        nonce: randomUUID(),
                    },
                },
            },
        );

        console.log("Outgoing Payment Grant:", outgoingPaymentGrant);

        // Store the outgoingPaymentGrant in the cache with grantId as the key
        grantCache.set(grantId, {
            outgoingPaymentGrant,
            outgoingPaymentQuote,
            payerWalletAddress,
            client, // Store the client instance if needed later
        });

        res.json({
            outgoingPaymentGrant,
            redirectUri: outgoingPaymentGrant.interact.finish.uri,
        });
    } catch (error) {
        console.error('Transaction Initiation Error:', error);
        res.status(500).json({ error: 'Failed to initiate transaction' });
    }
});

// GET /callback - Handle the redirect callback
app.get('/callback', async (req, res) => {
    const { grantId, interact_ref, hash } = req.query;

    if (!grantId) {
        return res.status(400).json({ error: 'Missing grantId in callback' });
    }

    // Retrieve the grant from the cache
    const cachedGrant = grantCache.get(grantId);

    if (!cachedGrant) {
        return res.status(404).json({ error: 'Grant not found or expired' });
    }

    const { outgoingPaymentGrant, outgoingPaymentQuote, payerWalletAddress, client } = cachedGrant;

    try {
        // Continue the grant using the interact_ref from the callback
        const continuationGrant = await client.grant.continue(
            {
                accessToken: outgoingPaymentGrant.continue.access_token.value,
                url: outgoingPaymentGrant.continue.uri,
            },
            {
                interact_ref: interact_ref,
            },
        );

        console.log("Continuation Grant:", continuationGrant);

        // Create the outgoing payment using the continuation grant
        const outgoingPayment = await client.outgoingPayment.create(
            {
                url: payerWalletAddress.resourceServer,
                accessToken: continuationGrant.access_token.value,
            },
            {
                walletAddress: payerWalletAddress.id,
                quoteId: outgoingPaymentQuote.id,
            },
        );

        console.log("Outgoing Payment Created:", outgoingPayment);

        // Optionally, remove the grant from the cache after successful processing
        grantCache.delete(grantId);

        res.json({
            success: true,
            outgoingPayment,
        });
    } catch (error) {
        console.error('Callback Handling Error:', error);
        res.status(500).json({ error: 'Failed to handle callback' });
    }
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});