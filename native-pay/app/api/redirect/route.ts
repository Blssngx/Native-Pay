// app/api/redirect/route.ts
// @ts-nocheck
import { NextResponse } from 'next/server';
import { getAuthenticatedClient } from '@/lib/interledgerClient';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interact_ref = searchParams.get('interact_ref');
    const hash = searchParams.get('hash');

    if (!interact_ref || !hash) {
      return NextResponse.json({ success: false, message: 'Missing interact_ref or hash' }, { status: 400 });
    }

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

    // Assuming you stored the outgoingPaymentGrant somewhere accessible
    // For simplicity, let's assume it's sent via query parameters or stored in a database/session
    // Here, we'll assume it's sent via query parameters (not recommended for production)
    // You should implement a secure storage mechanism

    // For demonstration, let's say you have access to outgoingPaymentGrant
    // In reality, you might need to pass it via state or session
    // This part may require adjustments based on your application's architecture

    // Example: Retrieve outgoingPaymentGrant from a database or in-memory store
    // const outgoingPaymentGrant = await getOutgoingPaymentGrantFromStore();

    // Since storing state across API routes isn't shown here, we'll skip it
    // Instead, you can integrate a session store or pass necessary data securely

    // For demonstration, we'll assume outgoingPaymentGrant is part of query params (not secure)
    const outgoingPaymentGrantJson = searchParams.get('outgoingPaymentGrant');
    if (!outgoingPaymentGrantJson) {
      return NextResponse.json({ success: false, message: 'Missing outgoingPaymentGrant' }, { status: 400 });
    }

    const outgoingPaymentGrant = JSON.parse(outgoingPaymentGrantJson);

    // Continue the grant process
    const continuationGrant = await client.grant.continue(
      {
        accessToken: outgoingPaymentGrant.continue.access_token.value,
        url: outgoingPaymentGrant.continue.uri,
      },
      {
        interact_ref: interact_ref,
      },
    );

    console.log('Continuation Grant:', continuationGrant);

    // Create Outgoing Payment
    const outgoingPayment = await client.outgoingPayment.create(
      {
        url: payerWalletAddress.resourceServer,
        accessToken: continuationGrant.access_token.value,
      },
      {
        walletAddress: payerWalletAddress.id,
        quoteId: outgoingPaymentGrant.quoteId, // Ensure this matches your grant structure
      },
    );

    console.log('Outgoing Payment:', outgoingPayment);

    return NextResponse.json({ success: true, outgoingPayment });

  } catch (error) {
    console.error('Error handling redirect:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}