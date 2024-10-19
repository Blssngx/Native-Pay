// app/api/initiate-payment/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/interledgerClient';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    // Initialize the authenticated client
    const client = await getAuthenticatedClient({
      walletAddressUrl: process.env.PAYEE_WALLET_ADDRESS!,
      privateKeyPath: process.env.PAYEE_PRIVATE_KEY_PATH!,
      keyId: process.env.PAYEE_KEY_ID!,
    });

    // Retrieve Payee and Payer Wallet Addresses
    const payeeWalletAddress = await client.walletAddress.get({
      url: process.env.PAYEE_WALLET_ADDRESS!,
    });

    const payerWalletAddress = await client.walletAddress.get({
      url: process.env.WALLET_ADDRESS!,
    });

    console.log('Payee Wallet Address:', payeeWalletAddress);

    // Request Grant for Incoming Payments
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

    // Create Incoming Payment
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
          value: "1000",
        },
      },
    );

    // Request Grant for Quotes
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

    // Create Quote for Outgoing Payment
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

    // Request Grant for Outgoing Payments
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
            uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/redirect`,
            nonce: randomUUID(),
          },
        },
      },
    );

    console.log('Outgoing Payment Grant:', outgoingPaymentGrant);

    return NextResponse.json({
      success: true,
      outgoingPaymentGrant,
    });

  } catch (error) {
    console.error('Error initiating payment:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}