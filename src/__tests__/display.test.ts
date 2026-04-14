import { describe, it, expect } from 'vitest';
import { formatSummary } from '../display.js';
import type { TransactionSummary } from '../types.js';

const summary: TransactionSummary = {
  network: 'testnet',
  inputs: [{ txid: 'abcd1234'.repeat(8), vout: 1, amount_satoshis: 100_000 }],
  total_input_satoshis: 100_000,
  outputs: [
    { address: 'tb1qdestination', amount_satoshis: 80_000, is_change: false },
    { address: 'tb1qchange', amount_satoshis: 19_000, is_change: true },
  ],
  total_output_satoshis: 99_000,
  total_destination_satoshis: 80_000,
  fee_satoshis: 1_000,
  fee_rate_sat_per_vbyte: 10,
  virtual_size_vbytes: 100,
};

describe('formatSummary', () => {
  it('includes the network', () => {
    expect(formatSummary(summary)).toContain('testnet');
  });

  it('includes shortened txid', () => {
    const output = formatSummary(summary);
    expect(output).toContain('abcd1234');
  });

  it('tags external outputs', () => {
    expect(formatSummary(summary)).toContain('[EXTERNAL]');
  });

  it('tags change outputs', () => {
    expect(formatSummary(summary)).toContain('[CHANGE]');
  });

  it('includes fee in satoshis', () => {
    expect(formatSummary(summary)).toContain('1000');
  });

  it('includes fee rate', () => {
    expect(formatSummary(summary)).toContain('10.00 sat/vB');
  });
});
