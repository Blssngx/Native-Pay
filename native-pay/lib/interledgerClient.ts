// lib/interledgerClient.ts

import { createAuthenticatedClient, AuthenticatedClient } from "@interledger/open-payments";
import fs from "fs/promises";

interface ClientConfig {
  walletAddressUrl: string;
  privateKeyPath: string;
  keyId: string;
}

export async function getAuthenticatedClient(config: ClientConfig): Promise<AuthenticatedClient> {
  const privateKey = await fs.readFile(config.privateKeyPath, 'utf-8');

  const client = await createAuthenticatedClient({
    walletAddressUrl: config.walletAddressUrl,
    privateKey: privateKey,
    keyId: config.keyId,
  });

  return client;
}