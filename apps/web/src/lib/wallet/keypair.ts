import { Keypair } from '@stellar/stellar-sdk';
import { hmac } from '@noble/hashes/hmac';
import { sha512 } from '@noble/hashes/sha2';
import { mnemonicToSeed } from './mnemonic';

const HARDENED = 0x80000000;
const STELLAR_PATH_PARTS = [44, 148, 0];

interface Node {
  key: Uint8Array;
  chainCode: Uint8Array;
}

function masterKey(seed: Uint8Array): Node {
  const I = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function ckdEd25519(parent: Node, index: number): Node {
  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0;
  data.set(parent.key, 1);
  new DataView(data.buffer).setUint32(33, index >>> 0, false);
  const I = hmac(sha512, parent.chainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

/**
 * SEP-0005 derivation: BIP-39 mnemonic -> seed -> SLIP-0010 ed25519 -> Stellar Keypair.
 * Path: m/44'/148'/0' (all hardened).
 */
export function keypairFromMnemonic(mnemonic: string): Keypair {
  const seed = mnemonicToSeed(mnemonic);
  let node = masterKey(seed);
  for (const idx of STELLAR_PATH_PARTS) {
    node = ckdEd25519(node, (idx | HARDENED) >>> 0);
  }
  return Keypair.fromRawEd25519Seed(Uint8Array.from(node.key) as unknown as Buffer);
}
