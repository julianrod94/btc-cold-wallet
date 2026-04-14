#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as bitcoin from 'bitcoinjs-lib';
import { getNetwork } from './network.js';
import { fetchUtxos, fetchFeeRate } from './fetch.js';
import { selectUtxos } from './select.js';
import { buildUnsignedPsbt } from './build.js';
import { InvalidParamsError } from './errors.js';
import type { Network } from './network.js';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      address: { type: 'string' },
      to: { type: 'string' },
      amount: { type: 'string' },
      network: { type: 'string' },
      'fee-rate': { type: 'string' },
    },
  });

  if (!values.address || !values.to || !values.amount || !values.network) {
    throw new Error(
      'Usage: build-tx --address <addr> --to <addr> --amount <sats> --network <testnet|mainnet> [--fee-rate <sat/vb>]',
    );
  }

  if (values.network !== 'testnet' && values.network !== 'mainnet') {
    throw new Error(`Invalid network: ${values.network}`);
  }

  const network = values.network as Network;
  const net = getNetwork(network);

  const amount = parseInt(values.amount, 10);
  if (isNaN(amount) || amount <= 0) {
    throw new InvalidParamsError('--amount must be a positive integer (satoshis)');
  }

  let signingScript: Buffer;
  let destScript: Buffer;
  try {
    signingScript = bitcoin.address.toOutputScript(values.address, net);
  } catch {
    throw new InvalidParamsError(`--address: invalid address for ${network}`);
  }
  try {
    destScript = bitcoin.address.toOutputScript(values.to, net);
  } catch {
    throw new InvalidParamsError(`--to: invalid address for ${network}`);
  }

  process.stderr.write('Fetching UTXOs...\n');
  const utxos = await fetchUtxos(values.address, network);
  if (utxos.length === 0) {
    throw new Error('No confirmed UTXOs found for this address');
  }
  process.stderr.write(`Found ${utxos.length} UTXO(s)\n`);

  let feeRate: number;
  if (values['fee-rate']) {
    feeRate = parseFloat(values['fee-rate']);
    if (isNaN(feeRate) || feeRate <= 0) {
      throw new InvalidParamsError('--fee-rate must be a positive number');
    }
  } else {
    process.stderr.write('Fetching fee rate...\n');
    feeRate = await fetchFeeRate(network);
  }
  process.stderr.write(`Fee rate: ${feeRate} sat/vB\n`);

  const selected = selectUtxos(utxos, amount, feeRate, destScript.length, signingScript.length);
  process.stderr.write(`Selected ${selected.length} UTXO(s)\n`);

  const psbt = buildUnsignedPsbt({
    network,
    signing_address: values.address,
    utxos: selected,
    outputs: [{ address: values.to, amount_satoshis: amount }],
    fee_rate_sat_per_vbyte: feeRate,
  });

  process.stdout.write(psbt.toBase64() + '\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
});
