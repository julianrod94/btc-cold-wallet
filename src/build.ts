import * as bitcoin from 'bitcoinjs-lib';
import { getNetwork } from './network.js';
import { InsufficientFundsError, DustOutputError } from './errors.js';
import { DUST_LIMIT_SATOSHIS } from './limits.js';
import { BASE_OVERHEAD_VBYTES, P2WPKH_INPUT_VBYTES, outputVbytes } from './size.js';
import type { Params } from './types.js';

export function buildUnsignedPsbt(params: Params): bitcoin.Psbt {
  const net = getNetwork(params.network);
  const psbt = new bitcoin.Psbt({ network: net });

  const signingScript = bitcoin.address.toOutputScript(params.signing_address, net);

  for (const utxo of params.utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: signingScript,
        value: utxo.amount_satoshis,
      },
    });
  }

  const destinationScripts = params.outputs.map((o) =>
    bitcoin.address.toOutputScript(o.address, net),
  );

  let totalDestinationVbytes = 0;
  for (let i = 0; i < params.outputs.length; i++) {
    const amount = params.outputs[i].amount_satoshis;
    if (amount < DUST_LIMIT_SATOSHIS) {
      throw new DustOutputError(amount, DUST_LIMIT_SATOSHIS);
    }
    psbt.addOutput({
      script: destinationScripts[i],
      value: amount,
    });
    totalDestinationVbytes += outputVbytes(destinationScripts[i].length);
  }

  const totalInput = params.utxos.reduce((sum, u) => sum + u.amount_satoshis, 0);
  const totalOutput = params.outputs.reduce((sum, o) => sum + o.amount_satoshis, 0);

  const inputVbytes = params.utxos.length * P2WPKH_INPUT_VBYTES;
  const changeVbytes = outputVbytes(signingScript.length);
  const vbytesWithChange =
    BASE_OVERHEAD_VBYTES + inputVbytes + totalDestinationVbytes + changeVbytes;

  const feeWithChange = Math.ceil(vbytesWithChange * params.fee_rate_sat_per_vbyte);
  const changeAmount = totalInput - totalOutput - feeWithChange;

  if (changeAmount < 0) {
    throw new InsufficientFundsError(totalInput, totalOutput + feeWithChange);
  }

  if (changeAmount >= DUST_LIMIT_SATOSHIS) {
    psbt.addOutput({
      script: signingScript,
      value: changeAmount,
    });
  }

  return psbt;
}
