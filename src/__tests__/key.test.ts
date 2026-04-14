import { describe, it, expect } from 'vitest';
import { generateKey, deriveP2wpkhAddress, encryptKey, decryptKey } from '../key.js';
import { DecryptionError } from '../errors.js';

describe('generateKey', () => {
  it('produces a testnet bech32 address', () => {
    const { address } = generateKey('testnet');
    expect(address).toMatch(/^tb1q/);
  });

  it('produces a mainnet bech32 address', () => {
    const { address } = generateKey('mainnet');
    expect(address).toMatch(/^bc1q/);
  });

  it('produces a different key each time', () => {
    const a = generateKey('testnet');
    const b = generateKey('testnet');
    expect(a.address).not.toBe(b.address);
  });
});

describe('deriveP2wpkhAddress', () => {
  it('round-trips: address derived from generated key matches stored address', () => {
    const { keyPair, address } = generateKey('testnet');
    expect(deriveP2wpkhAddress(keyPair.publicKey, 'testnet')).toBe(address);
  });
});

describe('encryptKey / decryptKey', () => {
  it('round-trips with correct password', () => {
    const { keyPair, address } = generateKey('testnet');
    const encrypted = encryptKey(keyPair, 'correct-password');
    const decrypted = decryptKey(encrypted, 'correct-password', 'testnet');
    expect(deriveP2wpkhAddress(decrypted.publicKey, 'testnet')).toBe(address);
  });

  it('throws DecryptionError on wrong password', () => {
    const { keyPair } = generateKey('testnet');
    const encrypted = encryptKey(keyPair, 'correct-password');
    expect(() => decryptKey(encrypted, 'wrong-password', 'testnet')).toThrowError(DecryptionError);
  });
});
