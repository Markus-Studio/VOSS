export class Counter<K> {
  private readonly map: Map<K, number> = new Map();

  incr(key: K): number {
    const current = this.map.get(key) || 0;
    const newValue = current + 1;
    this.map.set(key, newValue);
    return newValue;
  }

  decr(key: K): number {
    const current = this.map.get(key) || 0;
    const newValue = current - 1;
    this.map.set(key, newValue);
    return newValue;
  }

  get(key: K): number {
    return this.map.get(key) || 0;
  }

  iter(): Iterable<[K, number]> {
    return this.map[Symbol.iterator]();
  }
}
