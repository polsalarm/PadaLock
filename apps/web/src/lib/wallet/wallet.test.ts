import { describe, expect, it } from 'vitest';
import { isValidMnemonic, newMnemonic } from './mnemonic';
import { keypairFromMnemonic } from './keypair';
import { decryptMnemonic, encryptMnemonic } from './crypto';

describe('mnemonic', () => {
  it('generates valid 12-word mnemonic', () => {
    const m = newMnemonic();
    expect(m.split(' ').length).toBe(12);
    expect(isValidMnemonic(m)).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidMnemonic('not a real mnemonic at all please reject me thanks')).toBe(false);
  });
});

describe('keypair', () => {
  it('derives deterministic Stellar keypair from mnemonic (SEP-0005)', () => {
    const m = 'illness spike retreat truth genius clock brain pass fit cave bargain toe';
    const kp = keypairFromMnemonic(m);
    expect(kp.publicKey().startsWith('G')).toBe(true);
    expect(kp.publicKey()).toBe(keypairFromMnemonic(m).publicKey());
  });

  it('different mnemonics yield different keypairs', () => {
    const a = keypairFromMnemonic(newMnemonic());
    const b = keypairFromMnemonic(newMnemonic());
    expect(a.publicKey()).not.toBe(b.publicKey());
  });
});

describe('encrypt/decrypt', () => {
  it('roundtrips a mnemonic under password', async () => {
    const m = newMnemonic();
    const blob = await encryptMnemonic(m, 'correct-horse-battery-staple');
    const out = await decryptMnemonic(blob, 'correct-horse-battery-staple');
    expect(out).toBe(m);
  });

  it('fails to decrypt under wrong password', async () => {
    const m = newMnemonic();
    const blob = await encryptMnemonic(m, 'right');
    await expect(decryptMnemonic(blob, 'wrong')).rejects.toBeTruthy();
  });
});
