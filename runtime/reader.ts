import { Reader, Struct, DeserializeFn, EnumCase } from './types';

export class IReader implements Reader {
  private readonly view: DataView;
  private offsetStack: number[] = [];
  private currentOffset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  static DeserializeStruct<T extends Struct>(
    buffer: ArrayBuffer,
    deserializer: DeserializeFn<T>
  ): T {
    const reader = new IReader(buffer);
    return deserializer(reader);
  }

  static DeserializeEnum<T extends Struct>(
    buffer: ArrayBuffer,
    map: Record<number, DeserializeFn<T>>
  ): EnumCase<number, T> {
    const reader = new IReader(buffer);
    return reader.enum(0, map);
  }

  private boundCheck(offset: number, size: number) {
    if (this.currentOffset + offset + size <= this.view.byteLength) return;
    throw new Error('Invalid message, bound check failed.');
  }

  struct<T extends Struct>(offset: number, deserializer: DeserializeFn<T>): T {
    const pointerOffset = offset + this.currentOffset;
    const relativeOffset = this.u32(pointerOffset);
    const structOffset = offset + relativeOffset;

    if (structOffset >= this.view.byteLength) {
      throw new Error('Invalid message.');
    }

    this.offsetStack.push(this.currentOffset);
    this.currentOffset = structOffset;

    try {
      return deserializer(this);
    } finally {
      this.currentOffset = this.offsetStack.pop()!;
    }
  }

  enum<T extends Struct>(
    offset: number,
    map: Record<number, DeserializeFn<T>>
  ): EnumCase<number, T> {
    const type = this.u32(offset);
    const deserializer = map[type];
    if (!deserializer) {
      throw new Error('Invalid enum.');
    }
    const value = this.struct(offset + 4, deserializer);
    return { type, value };
  }

  uuid(offset: number): string {
    this.boundCheck(offset, 16);
    offset += this.currentOffset;
    const a = this.view
      .getUint32(offset + 0, true)
      .toString(16)
      .padStart(4, '0');
    const b = this.view
      .getUint32(offset + 8, true)
      .toString(16)
      .padStart(4, '0');
    const c = this.view
      .getUint32(offset + 16, true)
      .toString(16)
      .padStart(4, '0');
    const d = this.view
      .getUint32(offset + 24, true)
      .toString(16)
      .padStart(4, '0');
    return a + b + c + d;
  }

  u8(offset: number): number {
    this.boundCheck(offset, 1);
    return this.view.getUint8(offset + this.currentOffset);
  }

  u16(offset: number): number {
    this.boundCheck(offset, 2);
    return this.view.getUint16(offset + this.currentOffset, true);
  }

  u32(offset: number): number {
    this.boundCheck(offset, 4);
    return this.view.getUint32(offset + this.currentOffset, true);
  }

  i8(offset: number): number {
    this.boundCheck(offset, 1);
    return this.view.getInt8(offset + this.currentOffset);
  }

  i16(offset: number): number {
    this.boundCheck(offset, 2);
    return this.view.getInt16(offset + this.currentOffset, true);
  }

  i32(offset: number): number {
    this.boundCheck(offset, 4);
    return this.view.getInt32(offset + this.currentOffset, true);
  }

  f32(offset: number): number {
    this.boundCheck(offset, 4);
    return this.view.getFloat32(offset + this.currentOffset, true);
  }

  f64(offset: number): number {
    this.boundCheck(offset, 8);
    return this.view.getFloat64(offset + this.currentOffset, true);
  }

  bool(offset: number): boolean {
    this.boundCheck(offset, 1);
    const value = this.view.getUint8(offset + this.currentOffset);
    if (value < 2) return !!value;
    throw new Error('Invalid boolean.');
  }

  str(offset: number): string {
    this.boundCheck(offset, 8);

    offset += this.currentOffset;
    const size = this.view.getUint32(offset, true);
    const relativeOffset = this.view.getUint32(offset + 4, true);

    if (size === 0) {
      if (relativeOffset !== 0)
        throw new Error('Invalid string offset for empty string.');
      return '';
    }

    if (size % 2 === 1) {
      // UTF-16, bytes size = length * 2;
      throw new Error('Invalid string size.');
    }

    const length = size / 2;
    const stringOffset = offset + relativeOffset;
    this.boundCheck(stringOffset, size);

    let result = '';
    for (let i = 0, j = stringOffset; i < length; ++i, j += 2) {
      result += String.fromCharCode(this.view.getUint16(j, true));
    }
    return result;
  }
}
