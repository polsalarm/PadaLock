import { decryptMnemonic, encryptMnemonic, type EncryptedBlob } from './crypto';

const KEY = 'padalock.wallet.v1';

export function hasWallet(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.localStorage.getItem(KEY);
}

export function loadEncryptedBlob(): EncryptedBlob | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EncryptedBlob;
  } catch {
    return null;
  }
}

export async function saveWallet(mnemonic: string, password: string): Promise<void> {
  const blob = await encryptMnemonic(mnemonic, password);
  window.localStorage.setItem(KEY, JSON.stringify(blob));
}

export async function unlockWallet(password: string): Promise<string> {
  const blob = loadEncryptedBlob();
  if (!blob) throw new Error('No wallet found');
  return decryptMnemonic(blob, password);
}

export function wipeWallet(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(KEY);
}
