export function nextNumberDividableByPowOfTwo(
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
