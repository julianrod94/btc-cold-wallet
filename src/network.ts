import * as bitcoin from 'bitcoinjs-lib';

export type Network = 'testnet' | 'mainnet';

export function getNetwork(name: Network): bitcoin.Network {
  switch (name) {
    case 'testnet':
      return bitcoin.networks.testnet;
    case 'mainnet':
      return bitcoin.networks.bitcoin;
  }
}
