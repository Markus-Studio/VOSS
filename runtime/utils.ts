import { EnumCase } from './types';

const e = eval;
export const global = e('this');

export function nextNumberDivisibleByPowOfTwo(
  number: number,
  pow: number
): number {
  const n = (number >> pow) << pow;
  if (n === number) return n;
  return n + (1 << pow);
}

export function fastPow2Log2(n: number): number {
  let i = 0;
  for (; n; n >>= 1) {
    i++;
  }
  return i - 1;
}

export function mean(numbers: number[]): number {
  if (numbers.length === 0) return NaN;
  if (numbers.length === 1) return numbers[0];
  let sum = 0;
  for (const n of numbers) sum += n;
  return sum / numbers.length;
}

export function stddev(numbers: number[]): number {
  if (numbers.length === 0) return NaN;
  if (numbers.length === 1) return 0;

  let sum = 0;
  let sumSqr = 0;

  for (const n of numbers) {
    sum += n;
    sumSqr += n * n;
  }

  return Math.sqrt((sumSqr - (sum * sum) / numbers.length) / numbers.length);
}

export interface Resolvable<T> extends Promise<T> {
  resolve(data: T): void;
  reject(data: any): void;
}

export function createResolvable<T>(): Resolvable<T> {
  let resolve!: (data: T) => void;
  let reject!: (data: any) => void;
  const promise = new Promise((resolveCb, rejectCb) => {
    resolve = resolveCb;
    reject = rejectCb;
  });
  Object.assign(promise, { resolve, reject });
  return promise as Resolvable<T>;
}

export function enumEqual(a: EnumCase, b: EnumCase): boolean {
  return a.type === b.type && a.value.equal(b.value);
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(() => r(), ms));
}

type MapValue<T> = T extends WeakMap<any, infer V> ? V : never;
type MapKey<T> = T extends WeakMap<infer K, any> ? K : never;

export function getOrInsert<T extends WeakMap<any, any>>(
  map: T,
  key: MapKey<T>,
  valueCb: () => MapValue<T>
): MapValue<T> {
  if (map.has(key)) return map.get(key)!;
  const value = valueCb();
  map.set(key, value);
  return value;
}
