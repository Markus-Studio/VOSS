import { Builder, Struct, EnumCase, StructStatic } from './types';
import { nextNumberDivisibleByPowOfTwo, fastPow2Log2 } from './utils';

export class IBuilder implements Builder {
  private uint8array = new Uint8Array(256);
  private view = new DataView(this.uint8array.buffer);

  private offsetStack: number[] = [];
  private currentOffset = 0;
  private nextOffset = 0;

  private constructor(rootSize: number) {
    this.nextOffset = rootSize;
    this.grow();
  }

  static SerializeStruct(struct: Struct): Uint8Array {
    const builder = new IBuilder(
      ((struct.constructor as any) as StructStatic).size
    );
    struct.serialize(builder);
    return builder.build();
  }

  static SerializeEnum(value: EnumCase): Uint8Array {
    const builder = new IBuilder(8);
    builder.u32(0, value.type);
    builder.struct(4, value.value);
    return builder.build();
  }

  private grow() {
    if (this.nextOffset <= this.uint8array.byteLength) return;
    const newSize = this.uint8array.byteLength * 2;
    const newBuffer = new Uint8Array(newSize);
    newBuffer.set(this.uint8array);
    this.uint8array = newBuffer;
    this.view = new DataView(this.uint8array.buffer);
    this.grow();
  }

  build(): Uint8Array {
    return this.uint8array.slice(0, this.nextOffset);
  }

  struct(offset: number, value: Struct): void {
    const constructor = (value.constructor as any) as StructStatic;
    const size = constructor.size;
    const align = constructor.maxElementAlignment;
    const pointerOffset = offset + this.currentOffset;

    if (size === 0) {
      return this.view.setUint32(pointerOffset, 0);
    }

    const structOffset =
      align > 1
        ? nextNumberDivisibleByPowOfTwo(this.nextOffset, fastPow2Log2(align))
        : this.nextOffset;

    const relative = structOffset - pointerOffset;
    this.view.setUint32(pointerOffset, relative, true);

    this.nextOffset = structOffset + size;
    this.grow();

    this.offsetStack.push(this.currentOffset);
    this.currentOffset = structOffset;
    value.serialize(this);
    this.currentOffset = this.offsetStack.pop()!;
  }

  enum(offset: number, value: EnumCase): void {
    this.view.setUint32(offset + this.currentOffset, value.type, true);
    this.struct(offset + 4, value.value);
  }

  hash16(offset: number, value: string): void {
    if (value.length !== 32) throw new Error('HASH16 must be 32 characters.');
    offset += this.currentOffset;
    this.view.setUint32(offset + 0, parseInt(value.slice(0, 8), 16), false);
    this.view.setUint32(offset + 4, parseInt(value.slice(8, 16), 16), false);
    this.view.setUint32(offset + 8, parseInt(value.slice(16, 24), 16), false);
    this.view.setUint32(offset + 12, parseInt(value.slice(24, 32), 16), false);
  }

  hash20(offset: number, value: string): void {
    if (value.length !== 40) throw new Error('HASH20 must be 40 characters.');
    offset += this.currentOffset;
    this.view.setUint32(offset + 0, parseInt(value.slice(0, 8), 16), false);
    this.view.setUint32(offset + 4, parseInt(value.slice(8, 16), 16), false);
    this.view.setUint32(offset + 8, parseInt(value.slice(16, 24), 16), false);
    this.view.setUint32(offset + 12, parseInt(value.slice(24, 32), 16), false);
    this.view.setUint32(offset + 16, parseInt(value.slice(32, 40), 16), false);
  }

  u8(offset: number, value: number): void {
    this.view.setUint8(offset + this.currentOffset, value);
  }

  u16(offset: number, value: number): void {
    this.view.setUint16(offset + this.currentOffset, value, true);
  }

  u32(offset: number, value: number): void {
    this.view.setUint32(offset + this.currentOffset, value, true);
  }

  i8(offset: number, value: number): void {
    this.view.setInt8(offset + this.currentOffset, value);
  }

  i16(offset: number, value: number): void {
    this.view.setInt16(offset + this.currentOffset, value, true);
  }

  i32(offset: number, value: number): void {
    this.view.setInt32(offset + this.currentOffset, value, true);
  }

  f32(offset: number, value: number): void {
    this.view.setFloat32(offset + this.currentOffset, value, true);
  }

  f64(offset: number, value: number): void {
    this.view.setFloat64(offset + this.currentOffset, value, true);
  }

  bool(offset: number, value: boolean): void {
    this.view.setUint8(offset + this.currentOffset, value ? 1 : 0);
  }

  str(offset: number, value: string): void {
    offset += this.currentOffset;

    if (value.length === 0) {
      this.view.setUint32(offset, 0);
      this.view.setUint32(offset + 4, 0);
      return;
    }

    const stringOffset = this.nextOffset;
    const size = value.length * 2;
    const relative = stringOffset - offset;
    this.nextOffset += size;
    this.grow();

    this.view.setUint32(offset, size, true);
    this.view.setUint32(offset + 4, relative, true);

    for (let i = 0, j = stringOffset; i < value.length; ++i, j += 2) {
      this.view.setUint16(j, value.charCodeAt(i), true);
    }
  }
}
