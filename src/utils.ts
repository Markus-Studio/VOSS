export function toCamelCase(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
}

export function toPascalCase(str: string) {
  const camel = toCamelCase(str);
  return camel[0].toUpperCase() + camel.slice(1);
}

export class Counter<K> {
  private readonly map: Map<K, number> = new Map();

  constructor(readonly start: number = 0) {}

  incr(key: K): number {
    const current = this.map.get(key) || this.start;
    const newValue = current + 1;
    this.map.set(key, newValue);
    return newValue;
  }

  decr(key: K): number {
    const current = this.map.get(key) || this.start;
    const newValue = current - 1;
    this.map.set(key, newValue);
    return newValue;
  }

  get(key: K): number {
    return this.map.get(key) || this.start;
  }

  iter(): Iterable<[K, number]> {
    return this.map[Symbol.iterator]();
  }
}
