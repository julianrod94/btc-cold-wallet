import * as bitcoin from 'bitcoinjs-lib';
import { getNetwork, type Network } from './network.js';
import { estimateVbytes } from './size.js';
import {
  InvalidParamsError,
  KeyMismatchError,
  DustOutputError,
  LimitExceededError,
  UnauthorizedDestinationError,
} from './errors.js';
import {
  MAX_FEE_RATE_SAT_PER_VBYTE,
  MAX_FEE_PERCENTAGE_OF_OUTPUTS,
  MAX_DESTINATION_VALUE_SATOSHIS,
  MAX_INPUTS,
  MAX_OUTPUTS,
  DUST_LIMIT_SATOSHIS,
} from './limits.js';
import { ALLOWED_DESTINATION_ADDRESSES } from './whitelist.js';
import type { TransactionSummary, Utxo, AnalyzedOutput } from './types.js';

export function parsePsbt(input: string): bitcoin.Psbt {
  const trimmed = input.trim();
  try {
    return bitcoin.Psbt.fromBase64(trimmed);
  } catch {
    try {
      return bitcoin.Psbt.fromHex(trimmed);
    } catch {
      throw new InvalidParamsError('Unable to parse PSBT (not valid base64 or hex)');
    }
  }
}

export function analyzePsbt(
  psbt: bitcoin.Psbt,
  signingAddress: string,
  network: Network,
): TransactionSummary {
  const net = getNetwork(network);
  const signingScript = bitcoin.address.toOutputScript(signingAddress, net);

  const inputs: Utxo[] = [];
  let totalInput = 0;

  for (let i = 0; i < psbt.inputCount; i++) {
    const data = psbt.data.inputs[i];
    if (!data.witnessUtxo) {
      throw new InvalidParamsError(
        `Input ${i}: missing witnessUtxo (only SegWit inputs are supported)`,
      );
    }
    if (!data.witnessUtxo.script.equals(signingScript)) {
      throw new KeyMismatchError();
    }

    const txInput = psbt.txInputs[i];
    const txid = Buffer.from(txInput.hash).reverse().toString('hex');

    inputs.push({
      txid,
      vout: txInput.index,
      amount_satoshis: data.witnessUtxo.value,
    });
    totalInput += data.witnessUtxo.value;
  }

  const outputs: AnalyzedOutput[] = [];
  const outputScriptLengths: number[] = [];
  let totalOutput = 0;
  let totalDestination = 0;

  for (let i = 0; i < psbt.txOutputs.length; i++) {
    const out = psbt.txOutputs[i];
    let address: string;
    try {
      address = bitcoin.address.fromOutputScript(out.script, net);
    } catch {
      throw new InvalidParamsError(`Output ${i}: unable to decode address`);
    }

    const is_change = address === signingAddress;
    outputs.push({ address, amount_satoshis: out.value, is_change });
    outputScriptLengths.push(out.script.length);
    totalOutput += out.value;
    if (!is_change) {
      totalDestination += out.value;
    }
  }

  const fee = totalInput - totalOutput;
  const vbytes = estimateVbytes(inputs.length, outputScriptLengths);
  const feeRate = fee / vbytes;

  return {
    network,
    inputs,
    total_input_satoshis: totalInput,
    outputs,
    total_output_satoshis: totalOutput,
    total_destination_satoshis: totalDestination,
    fee_satoshis: fee,
    fee_rate_sat_per_vbyte: feeRate,
    virtual_size_vbytes: vbytes,
  };
}

export function verifyLimits(summary: TransactionSummary): void {
  if (summary.inputs.length > MAX_INPUTS) {
    throw new LimitExceededError(
      `too many inputs (${summary.inputs.length} > ${MAX_INPUTS})`,
    );
  }

  if (summary.outputs.length > MAX_OUTPUTS) {
    throw new LimitExceededError(
      `too many outputs (${summary.outputs.length} > ${MAX_OUTPUTS})`,
    );
  }

  for (const output of summary.outputs) {
    if (output.amount_satoshis < DUST_LIMIT_SATOSHIS) {
      throw new DustOutputError(output.amount_satoshis, DUST_LIMIT_SATOSHIS);
    }
  }

  if (summary.fee_satoshis <= 0) {
    throw new LimitExceededError(`invalid fee: ${summary.fee_satoshis} sat`);
  }

  if (summary.fee_rate_sat_per_vbyte > MAX_FEE_RATE_SAT_PER_VBYTE) {
    throw new LimitExceededError(
      `fee rate ${summary.fee_rate_sat_per_vbyte.toFixed(2)} sat/vB exceeds max ${MAX_FEE_RATE_SAT_PER_VBYTE}`,
    );
  }

  const feePercentage =
    summary.total_output_satoshis > 0
      ? (summary.fee_satoshis / summary.total_output_satoshis) * 100
      : 0;
  if (feePercentage > MAX_FEE_PERCENTAGE_OF_OUTPUTS) {
    throw new LimitExceededError(
      `fee ${feePercentage.toFixed(2)}% of outputs exceeds max ${MAX_FEE_PERCENTAGE_OF_OUTPUTS}%`,
    );
  }

  if (summary.total_destination_satoshis > MAX_DESTINATION_VALUE_SATOSHIS) {
    throw new LimitExceededError(
      `destination value ${summary.total_destination_satoshis} sat exceeds max ${MAX_DESTINATION_VALUE_SATOSHIS}`,
    );
  }

  for (const output of summary.outputs) {
    if (!output.is_change && !ALLOWED_DESTINATION_ADDRESSES.includes(output.address)) {
      throw new UnauthorizedDestinationError(output.address);
    }
  }
}
