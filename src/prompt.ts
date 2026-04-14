import * as readline from 'node:readline';
import { formatSummary } from './display.js';
import { UserAbortError } from './errors.js';
import type { TransactionSummary } from './types.js';

const MIN_PASSWORD_LENGTH = 8;

export async function promptPassword(label: string): Promise<string> {
  return readLineHidden(label);
}

export async function promptNewPassword(label: string): Promise<string> {
  while (true) {
    const first = await readLineHidden(label);
    if (first.length < MIN_PASSWORD_LENGTH) {
      process.stderr.write(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.\n`);
      continue;
    }
    const second = await readLineHidden(`Confirm ${label}`);
    if (first !== second) {
      process.stderr.write('Passwords do not match.\n');
      continue;
    }
    return first;
  }
}

export async function confirmTransaction(summary: TransactionSummary): Promise<void> {
  process.stderr.write(formatSummary(summary) + '\n');
  const answer = await readLineVisible(
    "Type 'yes' to confirm and sign, anything else to abort: ",
  );
  if (answer.trim().toLowerCase() !== 'yes') {
    throw new UserAbortError();
  }
}

function readLineVisible(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function readLineHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
      terminal: true,
    });

    const rlAny = rl as unknown as {
      _writeToOutput: (stringToWrite: string) => void;
      output: NodeJS.WritableStream;
    };

    rlAny._writeToOutput = (stringToWrite: string) => {
      if (stringToWrite.includes(prompt) || stringToWrite === '\r\n' || stringToWrite === '\n') {
        rlAny.output.write(stringToWrite);
      }
    };

    rl.question(prompt, (answer) => {
      rl.close();
      process.stderr.write('\n');
      resolve(answer);
    });
  });
}
