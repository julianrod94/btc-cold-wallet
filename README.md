# btc-cold-wallet

A CLI tool for creating signed Bitcoin transactions with an air-gapped signing flow. Built for P2WPKH (native SegWit) on mainnet and testnet4.

## Architecture

Three separate binaries map to three distinct operational roles:

```
[online machine]                    [offline machine]
                                    
build-tx                            gen-key
  Fetches UTXOs from mempool.space    Generates a BIP38-encrypted private key
  Selects coins (largest-first)       Writes encrypted key file
  Builds unsigned PSBT                Prints the signing address to stdout
  Prints base64 PSBT to stdout
         |                            sign-tx
         | (copy PSBT to USB)           Reads PSBT and verifies it
         +-------------------------->   Shows full transaction summary
                                        Operator types 'yes' to confirm
                                        Prompts for key password
                                        Signs and prints raw hex to stdout
```

The private key never touches the online machine. The online machine never touches the key file.

## Installation

```
npm install
npm run build
```

Binaries are in `dist/` and are executable after build (`postbuild` runs `chmod +x`).

## Running the binaries

After `npm run build`, invoke the entry points directly:

```
./dist/main-keygen.js ...
./dist/main-build.js  ...
./dist/main-sign.js   ...
```

## Usage

### Generate a key (offline machine)

```
./dist/main-keygen.js --network <testnet|mainnet> --out <file.bip38>
```

Prints the P2WPKH signing address to stdout. Back up the encrypted key file and remember the password — there is no recovery.

### Build an unsigned PSBT (online machine)

```
./dist/main-build.js --address <signing_address> --to <destination> --amount <satoshis> --network <testnet|mainnet> [--fee-rate <sat/vb>]
```

Fetches UTXOs for `--address` from mempool.space, selects coins, and writes the unsigned PSBT as base64 to stdout.

Redirect stdout to a file to save the PSBT:

```
./dist/main-build.js --address tb1q... --to tb1q... --amount 10000 --network testnet > unsigned.psbt
```

If `--fee-rate` is omitted, the half-hour fee estimate is fetched automatically.

### Sign a PSBT (offline machine)

```
./dist/main-sign.js --key <file.bip38> --network <testnet|mainnet> --psbt <file>
```

`--psbt` is optional. If omitted, the PSBT is read from stdin:

```
cat unsigned.psbt | ./dist/main-sign.js --key wallet.bip38 --network testnet > signed.hex
```

The operator sees the full transaction summary before the password is asked. Typing anything other than `yes` aborts without decrypting the key.

### Broadcast (online machine)

```
curl -X POST https://mempool.space/testnet4/api/tx -H 'Content-Type: text/plain' -d @signed.hex
```

## End-to-end example

```bash
# 1. Generate key (offline)
./dist/main-keygen.js --network testnet --out wallet.bip38
# → tb1q...  (signing address)

# 2. Fund the signing address from a testnet faucet

# 3. Build PSBT (online)
./dist/main-build.js --address tb1q... --to tb1q... --amount 10000 --network testnet > unsigned.psbt

# 4. Sign (offline)
./dist/main-sign.js --key wallet.bip38 --network testnet --psbt unsigned.psbt > signed.hex

# 5. Broadcast (online)
curl -X POST https://mempool.space/testnet4/api/tx -H 'Content-Type: text/plain' -d @signed.hex
```

Verified on testnet4: [115f07a975efb0eb65323b57368cd13750d8527335899309e0bbb790e74640dc](https://mempool.space/testnet4/tx/115f07a975efb0eb65323b57368cd13750d8527335899309e0bbb790e74640dc)

## Security

**Address whitelist** — `src/whitelist.ts` contains the list of allowed destination addresses. Any PSBT sending to an address not on the list is rejected before the operator is prompted. The default list is empty; operators add addresses and recompile.

**Hard limits** enforced before the operator prompt:

| Limit | Value |
|---|---|
| Max fee rate | 1000 sat/vB |
| Max fee as % of outputs | 50% |
| Max destination value | 10,000,000,000 sat (100 BTC) |
| Max inputs | 100 |
| Max outputs | 5 |
| Dust limit | 294 sat |

**BIP38 key encryption** — the private key is encrypted with scrypt + AES. The password is never stored and is prompted at runtime only after the operator has reviewed and confirmed the transaction.

**stdout / stderr split** — all human-readable output (prompts, summaries, diagnostics) goes to stderr. Only machine-readable data (PSBT base64, signed hex, generated address) goes to stdout. This makes piping safe.

**Key verification** — after decryption, `sign-tx` derives the address from the decrypted public key and checks it matches the address in the PSBT. A wrong password or wrong key file is caught before signing.

## Design notes

**Coin selection** — `build-tx` uses a largest-first greedy algorithm: UTXOs are sorted by value descending and selected until the total covers the amount plus the estimated fee. This minimises the number of inputs and therefore the transaction fee. A more sophisticated alternative is the [`coinselect`](https://github.com/bitcoinjs/coinselect) package (by the bitcoinjs-lib team), which implements Branch and Bound to find combinations that avoid a change output entirely. We chose not to use it because the added complexity is not justified for a cold wallet with few UTXOs and a single destination.

**Unconfirmed UTXOs** — `build-tx` includes unconfirmed UTXOs. In production you may want to filter to confirmed-only to avoid chained unconfirmed transactions; the filter is a one-liner in `src/fetch.ts`.

**Single key, single address** — this wallet is intentionally single-key. All change returns to the signing address. HD derivation (BIP32/BIP44) is out of scope.

**P2WPKH only** — inputs must be native SegWit v0. P2PKH and P2SH inputs are not supported.

## Development

```
npm test          # run unit tests
npm run test:watch
```

Tests cover coin selection, transaction limit enforcement, display formatting, and key generation / BIP38 round-trip.
