import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) {
  // @ts-expect-error node webcrypto satisfies the SubtleCrypto surface we use
  globalThis.crypto = webcrypto;
}
