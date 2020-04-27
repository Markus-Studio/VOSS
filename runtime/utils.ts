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
