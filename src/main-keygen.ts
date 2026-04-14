#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { writeFileSync } from 'node:fs';
import { generateKey, encryptKey } from './key.js';
import { promptNewPassword } from './prompt.js';
import type { Network } from './network.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      network: { type: 'string' },
      out: { type: 'string' },
    },
  });

  if (!values.network || !values.out) {
    throw new Error('Usage: gen-key --network <testnet|mainnet> --out <file>');
  }

  if (values.network !== 'testnet' && values.network !== 'mainnet') {
    throw new Error(`Invalid network: ${values.network}`);
  }

  const network = values.network as Network;
  const outFile = values.out;

  process.stderr.write(`Generating ${network} key...\n`);
  const { keyPair, address } = generateKey(network);

  const password = await promptNewPassword('Password to encrypt key: ');

  process.stderr.write('Encrypting...\n');
  const encrypted = encryptKey(keyPair, password);

  writeFileSync(outFile, encrypted, { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  process.stderr.write(`Encrypted key written to: ${outFile}\n`);
  process.stderr.write('IMPORTANT: Back up this file and remember the password.\n');
  process.stderr.write('There is no recovery — losing either means losing access to funds.\n');
  process.stdout.write(`${address}\n`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
