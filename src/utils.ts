import { PrimitiveTypeName, IRType } from './ir/type';
import { camelCase, snakeCase, words, upperFirst } from 'lodash';

export * from '../runtime/utils';

export function toCamelCase(str: string) {
  return (str.startsWith('_') ? '_' : '') + camelCase(str);
}

export function toPascalCase(str: string) {
  return (
    (str.startsWith('_') ? '_' : '') +
    words(str.replace(/['\u2019]/g, '')).reduce((result, word) => {
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

export function toOutputName(basename: string): string {
  return (
    toCamelCase(basename.replace(/\.voss$/g, '').replace(/\./, ' ')) + '-voss'
  );
}

export function flatten<T>(data: T[] | T[][]): T[] {
  return data.flat() as any;
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
    return map.hash16;
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

export function isIterable(obj: any): obj is Iterable<any> {
  if (typeof obj === 'object' && obj == null)
    return typeof obj[Symbol.iterator] === 'function';
  return false;
}

type Vec4 = [number, number, number, number];

function u32ToBytesVecLE(value: number): Vec4 {
  const vec: Vec4 = [0, 0, 0, 0];
  value |= 0;
  vec[0] = (value >> (8 * 0)) & 255;
  vec[1] = (value >> (8 * 1)) & 255;
  vec[2] = (value >> (8 * 2)) & 255;
  vec[3] = (value >> (8 * 3)) & 255;
  return vec;
}

export function u32FromBytesVecLE(vec4: Vec4) {
  let number = 0;
  number += vec4[0] << (8 * 0);
  number += vec4[1] << (8 * 1);
  number += vec4[2] << (8 * 2);
  number += vec4[3] << (8 * 3);
  return number;
}

export function createUniqueID(
  category: number,
  objectID: number,
  fieldID: number = 0
): number {
  if (category > 255 || category < 0) throw new Error('Category overflow.');
  if (objectID > 65535 || objectID < 0) throw new Error('Object ID overflow.');
  if (fieldID > 255 || fieldID < 0) throw new Error('Field ID overflow.');
  const o = u32ToBytesVecLE(objectID);
  return u32FromBytesVecLE([category, o[0], o[1], fieldID]);
}
