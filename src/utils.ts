import { PrimitiveTypeName, IRType } from './ir/type';
import { camelCase, snakeCase, words, upperFirst } from 'lodash';

export * from '../runtime/utils';

export function toCamelCase(str: string) {
  return (str.startsWith('_') ? '_' : '') + camelCase(str);
}

export function toPascalCase(str: string) {
  return (
    (str.startsWith('_') ? '_' : '') +
    words(str.replace(/['\u2019]/g, '')).reduce((result, word, index) => {
      if (word.toUpperCase() === word) {
        return result + word;
      }

      word = word.toLowerCase();
      return result + upperFirst(word);
    }, '')
  );
}

export function toSnakeCase(str: string) {
  return (str.startsWith('_') ? '_' : '') + snakeCase(str);
}

export function getObjectFieldPrivateType(
  map: Record<PrimitiveTypeName, string>,
  type: IRType
): string {
  if (type.isPrimitive) {
    return map[type.asPrimitiveName()];
  }

  if (type.isStructure) {
    return toPascalCase(type.asObject().name);
  }

  if (type.isRootObject) {
    return map.uuid;
  }

  if (type.isEnum) {
    return toPascalCase(type.asEnum().name);
  }

  throw new Error('Not implemented.');
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
