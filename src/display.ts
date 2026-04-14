import type { TransactionSummary } from './types.js';

const SEPARATOR = '='.repeat(65);

export function formatSummary(summary: TransactionSummary): string {
  const lines: string[] = [];

  lines.push(SEPARATOR);
  lines.push('TRANSACTION SUMMARY — REVIEW CAREFULLY BEFORE SIGNING');
  lines.push(SEPARATOR);
  lines.push(`Network: ${summary.network}`);
  lines.push('');

  const inputWord = summary.inputs.length === 1 ? 'UTXO' : 'UTXOs';
  lines.push(
    `Inputs (${summary.inputs.length} ${inputWord}, ${summary.total_input_satoshis} sat total):`,
  );
  summary.inputs.forEach((input, i) => {
    const shortTxid = `${input.txid.slice(0, 8)}...${input.txid.slice(-8)}`;
    lines.push(`  [${i + 1}] ${shortTxid}:${input.vout}    ${input.amount_satoshis} sat`);
  });
  lines.push('');

  lines.push(
    `Outputs (${summary.outputs.length}, ${summary.total_output_satoshis} sat total):`,
  );
  for (const o of summary.outputs) {
    const tag = o.is_change ? '[CHANGE]' : '[EXTERNAL]';
    lines.push(`  → ${o.address}    ${o.amount_satoshis} sat    ${tag}`);
  }
  lines.push('');

  const feePct =
    summary.total_output_satoshis > 0
      ? (summary.fee_satoshis / summary.total_output_satoshis) * 100
      : 0;
  lines.push(
    `Fee: ${summary.fee_satoshis} sat  (${summary.fee_rate_sat_per_vbyte.toFixed(2)} sat/vB, ${feePct.toFixed(2)}% of outputs)`,
  );
  lines.push('');
  lines.push(SEPARATOR);

  return lines.join('\n');
}
