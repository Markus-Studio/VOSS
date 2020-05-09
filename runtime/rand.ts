import { global } from './utils';
import { md5 } from './md5';

type TypedArray =
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array;

export const enum RandBackend {
  Crypto,
  Hash,
}

/**
 * A random number generator.
 */
export class Rand {
  /**
   * window.crypto or window.msCrypto.
   */
  private crypto?: Crypto;

  /**
   * The random generator has two backend (a.k.a modes) one uses browser's
   * Crypto, the other uses a combination of MD5 and Math.random() and custom
   * feeding (You can feed mouse move and other stuff like that).
   */
  get backend(): RandBackend {
    return this.crypto ? RandBackend.Crypto : RandBackend.Hash;
  }

  /**
   * Keep 32 u8 random numbers.
   */
  private generated: number[] = [];

  /**
   * The numbers that were given to this generator via `feed()`.
   */
  private feeded: number[] = [];

  constructor() {
    this.crypto = getAvailableCrypto();
  }

  feed(n: number): void {
    this.feeded.push(n);
    if (this.feeded.length === 10) this.feeded.shift();
    if (this.feeded.length === 1) this.generated = [];
  }

  private fromFeed(): string {
    if (this.feeded.length === 0) {
      const r = Math.random;
      return r() + '-' + r() + '#' + r() + '#' + r() + '-' + r();
    }
    return this.feeded.pop() + this.feeded.join('-');
  }

  /**
   * Returns a random U8.
   */
  rnd8() {
    if (this.crypto) {
      const buffer = new Uint32Array(1);
      this.crypto.getRandomValues(buffer);
      return buffer[0];
    }

    if (this.generated.length === 0) {
      const a = md5(this.fromFeed());
      const b = md5(a + this.fromFeed());
      const c = md5(a + b + Math.random());
      const d = md5(a + b + c);
      const tmp = c + d;

      for (let i = 0; i < 64; i += 2) {
        this.generated.push(parseInt(tmp.substr(i, 2), 16));
      }
    }

    const num = this.generated.pop()!;

    if (this.generated.length === 16) {
      const tmp = md5(this.generated.join('-') + this.fromFeed());
      for (let i = 0; i < 32; i += 2) {
        this.generated.push(parseInt(tmp.substr(i, 2), 16));
      }
    }

    return num;
  }

  /**
   * Returns a random U32 number.
   */
  rnd32(): number {
    if (this.crypto) {
      const buffer = new Uint32Array(1);
      this.crypto.getRandomValues(buffer);
      return buffer[0];
    }
    let r = 0;
    r += this.rnd8();
    r += this.rnd8() << 8;
    r += this.rnd8() << 16;
    r += this.rnd8() << 24;
    return r;
  }
}

function getAvailableCrypto(): Crypto | undefined {
  const buf = new Uint8Array(1);
  try {
    if ('crypto' in global) {
      global.crypto.getRandomValues(buf);
      return global.crypto;
    } else if ('msCrypto' in global) {
      global.msCrypto.getRandomValues(buf);
      return global.msCrypto;
    }
  } catch (e) {}
  return undefined;
}

export const rnd = new Rand();
