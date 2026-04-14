import type { Network } from './network.js';
import type { Utxo } from './types.js';
import { InvalidParamsError } from './errors.js';

const BASE_URL: Record<Network, string> = {
  testnet: 'https://mempool.space/testnet4/api',
  mainnet: 'https://mempool.space/api',
};

interface MempoolUtxo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

interface MempoolFeeEstimate {
  halfHourFee: number;
}

export async function fetchUtxos(address: string, network: Network): Promise<Utxo[]> {
  const url = `${BASE_URL[network]}/address/${address}/utxo`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new InvalidParamsError(`Failed to fetch UTXOs: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as MempoolUtxo[];
  return data.map((u) => ({ txid: u.txid, vout: u.vout, amount_satoshis: u.value }));
}

export async function fetchFeeRate(network: Network): Promise<number> {
  const url = `${BASE_URL[network]}/v1/fees/recommended`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new InvalidParamsError(`Failed to fetch fee rate: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as MempoolFeeEstimate;
  return data.halfHourFee;
}
