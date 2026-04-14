export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidParamsError extends WalletError {}

export class InsufficientFundsError extends WalletError {
  constructor(available: number, required: number) {
    super(`Insufficient funds: have ${available} sat, need ${required} sat`);
  }
}

export class DustOutputError extends WalletError {
  constructor(amount: number, limit: number) {
    super(`Output amount ${amount} sat is below dust limit ${limit} sat`);
  }
}

export class KeyMismatchError extends WalletError {
  constructor() {
    super(`Provided key does not match any UTXO being spent`);
  }
}

export class DecryptionError extends WalletError {
  constructor() {
    super(`Failed to decrypt key file (wrong password or corrupt file)`);
  }
}

export class UnauthorizedDestinationError extends WalletError {
  constructor(address: string) {
    super(`Destination address not in whitelist: ${address}`);
  }
}

export class LimitExceededError extends WalletError {
  constructor(message: string) {
    super(`Transaction rejected by policy: ${message}`);
  }
}

export class UserAbortError extends WalletError {
  constructor() {
    super('Transaction aborted by user');
  }
}
