import type { Utxo } from './types.js';
import { InsufficientFundsError } from './errors.js';
import { BASE_OVERHEAD_VBYTES, P2WPKH_INPUT_VBYTES, outputVbytes } from './size.js';

export function selectUtxos(
  utxos: Utxo[],
  targetAmount: number,
  feeRatePerVbyte: number,
  destScriptLength: number,
  changeScriptLength: number,
): Utxo[] {
  const sorted = [...utxos].sort((a, b) => b.amount_satoshis - a.amount_satoshis);
  const selected: Utxo[] = [];

  for (const utxo of sorted) {
    selected.push(utxo);

    const vbytes =
      BASE_OVERHEAD_VBYTES +
      selected.length * P2WPKH_INPUT_VBYTES +
      outputVbytes(destScriptLength) +
      outputVbytes(changeScriptLength);
    const fee = Math.ceil(vbytes * feeRatePerVbyte);
    const total = selected.reduce((sum, u) => sum + u.amount_satoshis, 0);

    if (total >= targetAmount + fee) {
      return selected;
    }
  }

  const total = selected.reduce((sum, u) => sum + u.amount_satoshis, 0);
  throw new InsufficientFundsError(total, targetAmount);
}
