import type { Network } from './network.js';

export interface Utxo {
  txid: string;
  vout: number;
  amount_satoshis: number;
}

export interface Output {
  address: string;
  amount_satoshis: number;
}

export interface Params {
  network: Network;
  signing_address: string;
  utxos: Utxo[];
  outputs: Output[];
  fee_rate_sat_per_vbyte: number;
}

export interface AnalyzedOutput {
  address: string;
  amount_satoshis: number;
  is_change: boolean;
}

export interface TransactionSummary {
  network: Network;
  inputs: Utxo[];
  total_input_satoshis: number;
  outputs: AnalyzedOutput[];
  total_output_satoshis: number;
  total_destination_satoshis: number;
  fee_satoshis: number;
  fee_rate_sat_per_vbyte: number;
  virtual_size_vbytes: number;
}
