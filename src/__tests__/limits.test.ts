import { describe, it, expect } from 'vitest';
import { verifyLimits } from '../psbt.js';
import {
  LimitExceededError,
  DustOutputError,
  UnauthorizedDestinationError,
} from '../errors.js';
import {
  MAX_FEE_RATE_SAT_PER_VBYTE,
  MAX_FEE_PERCENTAGE_OF_OUTPUTS,
  MAX_DESTINATION_VALUE_SATOSHIS,
  MAX_INPUTS,
  MAX_OUTPUTS,
  DUST_LIMIT_SATOSHIS,
} from '../limits.js';
import type { TransactionSummary } from '../types.js';

function makeSummary(overrides: Partial<TransactionSummary> = {}): TransactionSummary {
  return {
    network: 'testnet',
    inputs: [{ txid: 'a'.repeat(64), vout: 0, amount_satoshis: 100_000 }],
    total_input_satoshis: 100_000,
    outputs: [{ address: 'tb1qchange', amount_satoshis: 99_000, is_change: true }],
    total_output_satoshis: 99_000,
    total_destination_satoshis: 0,
    fee_satoshis: 1_000,
    fee_rate_sat_per_vbyte: 10,
    virtual_size_vbytes: 100,
    ...overrides,
  };
}

describe('verifyLimits', () => {
  it('passes a valid change-only summary', () => {
    expect(() => verifyLimits(makeSummary())).not.toThrow();
  });

  it('rejects too many inputs', () => {
    const inputs = Array.from({ length: MAX_INPUTS + 1 }, (_, i) => ({
      txid: 'a'.repeat(64),
      vout: i,
      amount_satoshis: 1_000,
    }));
    expect(() => verifyLimits(makeSummary({ inputs }))).toThrowError(LimitExceededError);
  });

  it('rejects too many outputs', () => {
    const outputs = Array.from({ length: MAX_OUTPUTS + 1 }, (_, i) => ({
      address: `tb1q${i}`,
      amount_satoshis: 1_000,
      is_change: true,
    }));
    expect(() => verifyLimits(makeSummary({ outputs }))).toThrowError(LimitExceededError);
  });

  it('rejects dust output', () => {
    const outputs = [{ address: 'tb1qchange', amount_satoshis: DUST_LIMIT_SATOSHIS - 1, is_change: true }];
    expect(() => verifyLimits(makeSummary({ outputs }))).toThrowError(DustOutputError);
  });

  it('rejects zero fee', () => {
    expect(() => verifyLimits(makeSummary({ fee_satoshis: 0 }))).toThrowError(LimitExceededError);
  });

  it('rejects fee rate above max', () => {
    expect(() =>
      verifyLimits(makeSummary({ fee_rate_sat_per_vbyte: MAX_FEE_RATE_SAT_PER_VBYTE + 1 })),
    ).toThrowError(LimitExceededError);
  });

  it('rejects fee percentage above max', () => {
    const fee_satoshis = 60_000;
    const total_output_satoshis = 100_000;
    expect(() =>
      verifyLimits(
        makeSummary({
          fee_satoshis,
          total_output_satoshis,
          fee_rate_sat_per_vbyte: 1,
        }),
      ),
    ).toThrowError(LimitExceededError);
  });

  it('rejects destination value above max', () => {
    const outputs = [
      {
        address: 'tb1qdest',
        amount_satoshis: MAX_DESTINATION_VALUE_SATOSHIS + 1,
        is_change: false,
      },
    ];
    expect(() =>
      verifyLimits(
        makeSummary({
          outputs,
          total_destination_satoshis: MAX_DESTINATION_VALUE_SATOSHIS + 1,
        }),
      ),
    ).toThrowError(LimitExceededError);
  });

  it('rejects unauthorized destination address', () => {
    const outputs = [{ address: 'tb1qunknown', amount_satoshis: 50_000, is_change: false }];
    expect(() =>
      verifyLimits(
        makeSummary({
          outputs,
          total_destination_satoshis: 50_000,
        }),
      ),
    ).toThrowError(UnauthorizedDestinationError);
  });
});
