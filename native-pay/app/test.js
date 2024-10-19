import { createAuthenticatedClient } from "@interledger/open-payments";
import { randomUUID } from "crypto";
import { exit } from "process";

const client = await createAuthenticatedClient({
    walletAddressUrl: process.env.PAYEE_WALLET_ADDRESS,
    privateKey: process.env.PAYEE_PRIVATE_KEY_PATH,
    keyId: process.env.PAYEE_KEY_ID,
});

const payeeWalletAddress = await client.walletAddress.get({
    url: process.env.PAYEE_WALLET_ADDRESS,
});

const payerWalletAddress = await client.walletAddress.get({
    url: process.env.WALLET_ADDRESS,
});

console.log(payeeWalletAddress)


const incomingPaymentgrant = await client.grant.request(
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

const incomingPayment = await client.incomingPayment.create(
    {
        url: payeeWalletAddress.resourceServer,
        accessToken: incomingPaymentgrant.access_token.value,
    },
    {
        walletAddress: payeeWalletAddress.id,
        incomingAmount: {
            assetCode: payeeWalletAddress.assetCode,
            assetScale: payeeWalletAddress.assetScale,
            value : "1000"
        },
    },
);

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

const outgoingPaymentquote = await client.quote.create(
    {
        url: payerWalletAddress.resourceServer,
        accessToken: quoteGrant.access_token.value
    },
    {
        method: "ilp",
        walletAddress: payerWalletAddress.id,
        receiver: incomingPayment.id,
    },
);

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
                            value: outgoingPaymentquote.debitAmount.value,
                            assetCode: outgoingPaymentquote.debitAmount.assetCode,
                            assetScale: outgoingPaymentquote.debitAmount.assetScale,
                        },
                    },
                },
            ],
        },
        interact: {
            start: ["redirect"],
            finish: {
                method: "redirect",
                uri: "http://localhost:3000",
                nonce: randomUUID(),
            },
        },
    },
);

console.log(outgoingPaymentGrant)


app.get('/', async (req, res) => {
    const { interact_ref, hash } = req.query;
    // console.log(interact_ref)
    res.send({ success: true })
    console.log(outgoingPaymentGrant)

    const continuationGrant = await client.grant.continue(
        {
            accessToken: outgoingPaymentGrant.continue.access_token.value,
            url: outgoingPaymentGrant.continue.uri,
        },
        {
            interact_ref: interact_ref,
        },
    );

    console.log("con grant:", continuationGrant)
    console.log({
        url: new URL(process.env.WALLET_ADDRESS).origin,
        accessToken: continuationGrant.access_token.value,
    },
        {
            walletAddress: process.env.WALLET_ADDRESS,
            quoteId: outgoingPaymentquote.id,
        });

    try {
        const outgoingPayment = await client.outgoingPayment.create(
            {
                url: payerWalletAddress.resourceServer,
                accessToken: continuationGrant.access_token.value,
            },
            {
                walletAddress: payerWalletAddress.id,
                quoteId: outgoingPaymentquote.id,
            },
        );


    } catch (error) {
        console.log(error)
    }
})

app.listen(3000)

