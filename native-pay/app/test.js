// import { createAuthenticatedClient } from "@interledger/open-payments";
// import { randomUUID } from "crypto";
// import 'dotenv/config';
// import express from "express";
// const app = express();

// const client = await createAuthenticatedClient({
//     walletAddressUrl: process.env.PAYEE_WALLET_ADDRESS,
//     privateKey: Buffer.from("LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1DNENBUUF3QlFZREsyVndCQ0lFSUUxNEFUVGJjSkgzaC9RT0d4ZHNsR0w2UmE4eGc1U0RVcjRGczlzeCtmNUcKLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLQo=","base64"),
//     keyId: process.env.PAYEE_KEY_ID,
// });

// const payeeWalletAddress = await client.walletAddress.get({
//     url: process.env.PAYEE_WALLET_ADDRESS,
// });

// const payerWalletAddress = await client.walletAddress.get({
//     url: process.env.WALLET_ADDRESS,
// });

// console.log(payeeWalletAddress)


// const incomingPaymentgrant = await client.grant.request(
//     {
//         url: payeeWalletAddress.authServer,
//     },
//     {
//         access_token: {
//             access: [
//                 {
//                     type: "incoming-payment",
//                     actions: ["list", "read", "read-all", "complete", "create"],
//                 },
//             ],
//         },
//     },
// );

// const incomingPayment = await client.incomingPayment.create(
//     {
//         url: payeeWalletAddress.resourceServer,
//         accessToken: incomingPaymentgrant.access_token.value,
//     },
//     {
//         walletAddress: payeeWalletAddress.id,
//         incomingAmount: {
//             assetCode: payeeWalletAddress.assetCode,
//             assetScale: payeeWalletAddress.assetScale,
//             value : "1000"
//         },
//     },
// );

// const quoteGrant = await client.grant.request(
//     {
//         url: payerWalletAddress.authServer,
//     },
//     {
//         access_token: {
//             access: [
//                 {
//                     type: "quote",
//                     actions: ["create", "read"],
//                 },
//             ],
//         },
//     },
// );

// const outgoingPaymentquote = await client.quote.create(
//     {
//         url: payerWalletAddress.resourceServer,
//         accessToken: quoteGrant.access_token.value
//     },
//     {
//         method: "ilp",
//         walletAddress: payerWalletAddress.id,
//         receiver: incomingPayment.id,
//     },
// );

// const outgoingPaymentGrant = await client.grant.request(
//     {
//         url: payerWalletAddress.authServer,
//     },
//     {
//         access_token: {
//             access: [
//                 {
//                     identifier: payerWalletAddress.id,
//                     type: "outgoing-payment",
//                     actions: ["read", "create"],
//                     limits: {
//                         debitAmount: {
//                             value: outgoingPaymentquote.debitAmount.value,
//                             assetCode: outgoingPaymentquote.debitAmount.assetCode,
//                             assetScale: outgoingPaymentquote.debitAmount.assetScale,
//                         },
//                     },
//                 },
//             ],
//         },
//         interact: {
//             start: ["redirect"],
//             finish: {
//                 method: "redirect",
//                 uri: "http://localhost:3000",
//                 nonce: randomUUID(),
//             },
//         },
//     },
// );

// console.log(outgoingPaymentGrant)


// app.get('/', async (req, res) => {
//     const { interact_ref, hash } = req.query;
//     // console.log(interact_ref)
//     res.send({ success: true })
//     console.log(outgoingPaymentGrant)

//     const continuationGrant = await client.grant.continue(
//         {
//             accessToken: outgoingPaymentGrant.continue.access_token.value,
//             url: outgoingPaymentGrant.continue.uri,
//         },
//         {
//             interact_ref: interact_ref,
//         },
//     );

//     console.log("con grant:", continuationGrant)
//     console.log({
//         url: new URL(process.env.WALLET_ADDRESS).origin,
//         accessToken: continuationGrant.access_token.value,
//     },
//         {
//             walletAddress: process.env.WALLET_ADDRESS,
//             quoteId: outgoingPaymentquote.id,
//         });

//     try {
//         const outgoingPayment = await client.outgoingPayment.create(
//             {
//                 url: payerWalletAddress.resourceServer,
//                 accessToken: continuationGrant.access_token.value,
//             },
//             {
//                 walletAddress: payerWalletAddress.id,
//                 quoteId: outgoingPaymentquote.id,
//             },
//         );


//     } catch (error) {
//         console.log(error)
//     }
// })

// app.listen(3000)


import express from 'express';
import { createAuthenticatedClient } from '@interledger/open-payments';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const app = express();
app.use(express.json());

// Initialize variables to store client and wallet addresses
let client;
let payeeWalletAddress;
let payerWalletAddress;

// Function to initialize the Interledger client and retrieve wallet addresses
const initializeClient = async () => {
  if (!client) {
    client = await createAuthenticatedClient({
      walletAddressUrl: process.env.PAYEE_WALLET_ADDRESS,
      privateKey: Buffer.from(process.env.PRIVATE_KEY, 'base64'),
      keyId: process.env.PAYEE_KEY_ID,
    });
  }

  if (!payeeWalletAddress) {
    payeeWalletAddress = await client.walletAddress.get({
      url: process.env.PAYEE_WALLET_ADDRESS,
    });
  }

  if (!payerWalletAddress) {
    payerWalletAddress = await client.walletAddress.get({
      url: process.env.WALLET_ADDRESS,
    });
  }
};

// POST /initiate-transaction
app.post('/initiate-transaction', async (req, res) => {
  try {
    // Initialize client and wallet addresses
    await initializeClient();

    // Step 1: Request Incoming Payment Grant
    const incomingPaymentGrant = await client.grant.request(
      {
        url: payeeWalletAddress.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: 'incoming-payment',
              actions: ['list', 'read', 'read-all', 'complete', 'create'],
            },
          ],
        },
      }
    );

    // Step 2: Create Incoming Payment
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
          value: '1000', // Adjust as needed or make dynamic
        },
      }
    );

    // Step 3: Request Quote Grant
    const quoteGrant = await client.grant.request(
      {
        url: payerWalletAddress.authServer,
      },
      {
        access_token: {
          access: [
            {
              type: 'quote',
              actions: ['create', 'read'],
            },
          ],
        },
      }
    );

    // Step 4: Create Quote
    const outgoingPaymentQuote = await client.quote.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value,
      },
      {
        method: 'ilp',
        walletAddress: payerWalletAddress.id,
        receiver: incomingPayment.id,
      }
    );

    // Step 5: Request Outgoing Payment Grant
    const outgoingPaymentGrant = await client.grant.request(
      {
        url: payerWalletAddress.authServer,
      },
      {
        access_token: {
          access: [
            {
              identifier: payerWalletAddress.id,
              type: 'outgoing-payment',
              actions: ['read', 'create'],
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
          start: ['redirect'],
          finish: {
            method: 'redirect',
            uri: process.env.REDIRECT_URI,
            nonce: randomUUID(),
          },
        },
      }
    );

    // Store the outgoingPaymentGrant in memory or a database for later use
    // For simplicity, we'll store it in a temporary in-memory object
    // In production, consider using a persistent store
    const transactionId = randomUUID();
    ongoingTransactions[transactionId] = {
      outgoingPaymentGrant,
      outgoingPaymentQuote,
      payerWalletAddress,
    };

    // Respond with the transaction details, including the redirect URL
    res.json({
      success: true,
      transactionId,
      redirectUri: outgoingPaymentGrant.interact.start.redirect.uri,
      interactRef: outgoingPaymentGrant.interact.start.redirect.interact_ref,
    });
  } catch (error) {
    console.error('Transaction Initiation Error:', error);
    res.status(500).json({ error: 'Failed to initiate transaction' });
  }
});

// In-memory store for ongoing transactions
const ongoingTransactions = {};

// GET /callback
app.get('/callback', async (req, res) => {
  const { interact_ref, hash, transactionId } = req.query;

  if (!interact_ref || !hash || !transactionId) {
    return res.status(400).json({ error: 'Missing interact_ref, hash, or transactionId in query parameters' });
  }

  const transaction = ongoingTransactions[transactionId];

  if (!transaction) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }

  try {
    // Continue the outgoing payment grant
    const continuationGrant = await client.grant.continue(
      {
        accessToken: transaction.outgoingPaymentGrant.continue.access_token.value,
        url: transaction.outgoingPaymentGrant.continue.uri,
      },
      {
        interact_ref: interact_ref,
      }
    );

    // Create outgoing payment
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: transaction.payerWalletAddress.resourceServer,
        accessToken: continuationGrant.access_token.value,
      },
      {
        walletAddress: process.env.WALLET_ADDRESS,
        quoteId: transaction.outgoingPaymentQuote.id,
      }
    );

    // Optionally, remove the transaction from the store
    delete ongoingTransactions[transactionId];

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});