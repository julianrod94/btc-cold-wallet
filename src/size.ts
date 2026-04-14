export const BASE_OVERHEAD_VBYTES = 11;
export const P2WPKH_INPUT_VBYTES = 68;

export function outputVbytes(scriptLength: number): number {
  return 9 + scriptLength;
}

export function estimateVbytes(inputCount: number, outputScriptLengths: number[]): number {
  const inputs = inputCount * P2WPKH_INPUT_VBYTES;
  const outputs = outputScriptLengths.reduce((sum, len) => sum + outputVbytes(len), 0);
  return BASE_OVERHEAD_VBYTES + inputs + outputs;
}
