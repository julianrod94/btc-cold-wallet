#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as bitcoin from 'bitcoinjs-lib';
import { decryptKey, deriveP2wpkhAddress } from './key.js';
import { parsePsbt, analyzePsbt, verifyLimits } from './psbt.js';
import { promptPassword, confirmTransaction } from './prompt.js';
import { getNetwork } from './network.js';
import { InvalidParamsError, KeyMismatchError } from './errors.js';
import type { Network } from './network.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      psbt: { type: 'string' },
      key: { type: 'string' },
      network: { type: 'string' },
    },
  });

  if (!values.key || !values.network) {
    throw new Error('Usage: sign-tx --key <file> --network <testnet|mainnet> [--psbt <file>]');
  }

  if (values.network !== 'testnet' && values.network !== 'mainnet') {
    throw new Error(`Invalid network: ${values.network}`);
  }

  const network = values.network as Network;
  const net = getNetwork(network);

  const psbtInput = values.psbt
    ? readFileSync(values.psbt, 'utf8')
    : readFileSync(0, 'utf8');

  const psbt = parsePsbt(psbtInput);

  const firstInput = psbt.data.inputs[0];
  if (!firstInput?.witnessUtxo) {
    throw new InvalidParamsError('Input 0: missing witnessUtxo');
  }
  const signingAddress = bitcoin.address.fromOutputScript(firstInput.witnessUtxo.script, net);

  const summary = analyzePsbt(psbt, signingAddress, network);
  verifyLimits(summary);

  await confirmTransaction(summary);

  const encryptedKey = readFileSync(values.key, 'utf8').trim();
  const password = await promptPassword('Password: ');
  const keyPair = decryptKey(encryptedKey, password, network);

  if (deriveP2wpkhAddress(keyPair.publicKey, network) !== signingAddress) {
    throw new KeyMismatchError();
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  process.stdout.write(psbt.extractTransaction().toHex() + '\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
