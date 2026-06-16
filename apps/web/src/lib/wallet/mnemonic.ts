import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export function newMnemonic(strength: 128 | 256 = 128): string {
  return generateMnemonic(wordlist, strength);
}

export function isValidMnemonic(m: string): boolean {
  return validateMnemonic(m, wordlist);
}

export function mnemonicToSeed(m: string, passphrase = ''): Uint8Array {
  return mnemonicToSeedSync(m, passphrase);
}
