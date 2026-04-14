import { describe, it, expect } from 'vitest';
import { selectUtxos } from '../select.js';
import { InsufficientFundsError } from '../errors.js';
import type { Utxo } from '../types.js';

const P2WPKH_SCRIPT_LEN = 22;

const utxos: Utxo[] = [
  { txid: 'a'.repeat(64), vout: 0, amount_satoshis: 100_000 },
  { txid: 'b'.repeat(64), vout: 0, amount_satoshis: 50_000 },
  { txid: 'c'.repeat(64), vout: 0, amount_satoshis: 10_000 },
];

describe('selectUtxos', () => {
  it('picks largest UTXO first', () => {
    const selected = selectUtxos(utxos, 90_000, 1, P2WPKH_SCRIPT_LEN, P2WPKH_SCRIPT_LEN);
    expect(selected[0].amount_satoshis).toBe(100_000);
    expect(selected.length).toBe(1);
  });

  it('adds more UTXOs until fee is covered', () => {
    const selected = selectUtxos(utxos, 120_000, 1, P2WPKH_SCRIPT_LEN, P2WPKH_SCRIPT_LEN);
    expect(selected.length).toBe(2);
    expect(selected[0].amount_satoshis).toBe(100_000);
    expect(selected[1].amount_satoshis).toBe(50_000);
  });

  it('throws InsufficientFundsError when UTXOs are exhausted', () => {
    expect(() =>
      selectUtxos(utxos, 200_000, 1, P2WPKH_SCRIPT_LEN, P2WPKH_SCRIPT_LEN),
    ).toThrowError(InsufficientFundsError);
  });

  it('does not mutate the input array order', () => {
    const input = [...utxos];
    selectUtxos(utxos, 90_000, 1, P2WPKH_SCRIPT_LEN, P2WPKH_SCRIPT_LEN);
    expect(utxos).toEqual(input);
  });
});
