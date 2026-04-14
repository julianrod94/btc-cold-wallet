import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, type ECPairInterface } from 'ecpair';
import { randomBytes } from 'node:crypto';
import bip38 from 'bip38';
import { getNetwork, type Network } from './network.js';
import { DecryptionError } from './errors.js';

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

export interface GeneratedKey {
  keyPair: ECPairInterface;
  address: string;
}

export function generateKey(network: Network): GeneratedKey {
  const net = getNetwork(network);

  let privateKey: Buffer;
  do {
    privateKey = randomBytes(32);
  } while (!ecc.isPrivate(privateKey));

  const keyPair = ECPair.fromPrivateKey(privateKey, { network: net, compressed: true });
  const address = deriveP2wpkhAddress(keyPair.publicKey, network);

  return {
    keyPair,
    address,
  };
}

export function deriveP2wpkhAddress(pubkey: Buffer, network: Network): string {
  const net = getNetwork(network);
  const { address } = bitcoin.payments.p2wpkh({ pubkey, network: net });
  if (!address) {
    throw new Error('Failed to derive P2WPKH address');
  }
  return address;
}

export function encryptKey(keyPair: ECPairInterface, password: string): string {
  if (!keyPair.privateKey) {
    throw new Error('Cannot encrypt key without private key');
  }
  return bip38.encrypt(Buffer.from(keyPair.privateKey), keyPair.compressed, password);
}

export function decryptKey(
  encrypted: string,
  password: string,
  network: Network,
): ECPairInterface {
  let decrypted: { privateKey: Buffer; compressed: boolean };
  try {
    decrypted = bip38.decrypt(encrypted, password);
  } catch {
    throw new DecryptionError();
  }

  const net = getNetwork(network);
  return ECPair.fromPrivateKey(decrypted.privateKey, {
    network: net,
    compressed: decrypted.compressed,
  });
}
