import express from 'express';
import { createAuthenticatedClient } from '@interledger/open-payments';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import mongoose from 'mongoose';
import { createClient, AccountFilterFlags, CreateTransferError } from 'tigerbeetle-node';

const DATABASE_URL="mongodb+srv://blessinghove69:SyZdxnA6Jgd28B6S@cluster0.s0d7k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
const schemaData = JSON.parse(fs.readFileSync('./mongodb/schema.json', 'utf8'));
const userSchema = new mongoose.Schema(schemaData);
const userModel = mongoose.model('User', userSchema);
const userId = 2;

await mongoose.connect(DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

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

const tigerClient = createClient({
    cluster_id: 0n,
    replica_addresses: [process.env.TB_ADDRESS || '3001'],
  });

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
    // const walletConfig = walletsConfig[name];

    const user = await userModel.findOne({name : name})
    
    if (!user) {
        return res.status(404).json({ error: `Wallet configuration for name "${name}" not found` });
    }

    try {
        const { wallet_address, private_key, key_id } = user;

        const client = await createAuthenticatedClient({
            walletAddressUrl :wallet_address,
            privateKey: Buffer.from(private_key, 'base64'),
            keyId: key_id,
        });

        const payeeWalletAddress = await client.walletAddress.get({
            url: wallet_address,
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

app.get('/balance' , async (req, res) => {
    const filter = {
        account_id: BigInt(userId),
        user_data_128: 0n, // No filter by UserData.
        user_data_64: 0n,
        user_data_32: 0,
        code: 0, // No filter by Code.
        timestamp_min: 0n, // No filter by Timestamp.
        timestamp_max: 0n, // No filter by Timestamp.
        limit: 10, // Limit to ten balances at most.
        flags: AccountFilterFlags.debits | // Include transfer from the debit side.
          AccountFilterFlags.credits | // Include transfer from the credit side.
          AccountFilterFlags.reversed, // Sort by timestamp in reverse-chronological order.
      };
      
      const account_balances = await tigerClient.getAccountBalances(filter);

      console.log(account_balances)
      if (account_balances && Array.isArray(account_balances) && account_balances.length > 0){
        return res.status(200).json({
            balance : account_balances[0].credits_pending - account_balances[0].debits_pending
        })
      }

      res.status(500).json({
        error : 'Not able to get balance'
      })
})

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

        // res.json({
        //     success: true,
        //     outgoingPayment,
        // });

        if (outgoingPayment){
            const amount = outgoingPayment.debitAmount.value/10
            
           const transfer_errors = await tigerClient.createTransfers([{
            id: BigInt(Date.now()), // TigerBeetle time-based ID.
            debit_account_id: BigInt(userId),
            credit_account_id: 2n,
            amount: BigInt(amount),
            pending_id: 0n,
            user_data_128: 0n,
            user_data_64: 0n,
            user_data_32: 0,
            timeout: 0,
            ledger: 700,
            code: 720,
            flags: 0,
            timestamp: 0n,
          }]); 
        }
        

        res.redirect("https://wallet.interledger-test.dev/transactions")
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