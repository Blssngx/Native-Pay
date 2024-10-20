import assert from 'assert';
const schema = {
    id: 'number',
    ledger: 'number',
    code: 'number',
    debits_pending: 'number',
    debits_posted: 'number',
    credits_pending: 'number',
    credits_posted: 'number',
    user_data_128: 'number',
    user_data_64: 'number',
    user_data_32: 'number',
    reserved: 'number',
    flags: 'number',
    timestamp: 'number'
  };
//   const TigerBeetle = require('tigerbeetle-node');
import fs from 'fs';
import {
    createClient,
    CreateAccountError,
    CreateTransferError,
    AccountFilterFlags,
    AccountFlags
} from 'tigerbeetle-node';
  
  const data = JSON.parse(fs.readFileSync('./mongodb/input.json', 'utf8'));
  
  const filteredAccounts = data.map(account => {
    return Object.keys(schema).reduce((filtered, key) => {
      if (account[key] !== undefined) filtered[key] = account[key];
      filtered[key] = BigInt(filtered[key] ?? 0);
      if(["user_data_32", "reserved", "ledger", "code"].includes(key)) filtered[key] = Number(filtered[key] ?? 0);
      if(key == "flags") filtered[key] = AccountFlags.history;
      if(key == "timestamp") filtered[key] = BigInt(0);
      return filtered;
    }, {});
  });
  console.log(filteredAccounts);
  
  (async () => {
    const client = createClient({
        cluster_id: 0n,
        replica_addresses: [process.env.TB_ADDRESS || '3000'],
      });
    
      let accountErrors = await client.createAccounts(filteredAccounts);
    console.log('Accounts inserted');
    for (const error of accountErrors) {
        console.error(`Batch account at ${error.index} failed to create: ${CreateAccountError[error.result]}.`);
      }
  })();
