export function nextNumberDividableByPowOfTwo(
  number: number,
  pow: number
): number {
  const n = (number >> pow) << pow;
  if (n === number) return n;
  return n + (1 << pow);
}

export function fastSqrtTwo(n: number): number {
  let i = 0;
  for (; n; n >>= 1) {
    i++;
  }
  return i - 1;
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
