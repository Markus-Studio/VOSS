import { Builder, Struct, EnumCase } from './types';
import { nextNumberDividableByPowOfTwo, fastSqrtTwo } from './utils';

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
    const builder = new IBuilder(struct._size);
    struct._serialize(builder);
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
  }

  build(): Uint8Array {
    return this.uint8array.slice(0, this.nextOffset);
  }

  struct(offset: number, value: Struct): void {
    const size = value._size;
    const align = value._maxElementAlignment;
    const pointerOffset = offset + this.currentOffset;

    if (size === 0) {
      return this.view.setUint32(pointerOffset, 0);
    }

    const structOffset =
      align > 1
        ? nextNumberDividableByPowOfTwo(this.nextOffset, fastSqrtTwo(align))
        : this.nextOffset;

    const relative = structOffset - pointerOffset;
    this.view.setUint32(pointerOffset, relative, true);

    this.nextOffset = structOffset + size;
    this.grow();

    this.offsetStack.push(this.currentOffset);
    this.currentOffset = structOffset;
    value._serialize(this);
    this.currentOffset = this.offsetStack.pop()!;
  }

  enum(offset: number, value: EnumCase): void {
    this.view.setUint32(offset + this.currentOffset, value.type, true);
    this.struct(offset + 4, value.value);
  }

  uuid(offset: number, value: string): void {
    if (value.length !== 32) throw new Error('UUID must be 32 characters.');
    offset += this.currentOffset;
    this.view.setUint32(offset, parseInt(value.slice(0, 8), 16), true);
    this.view.setUint32(offset + 8, parseInt(value.slice(8, 16), 16), true);
    this.view.setUint32(offset + 16, parseInt(value.slice(16, 24), 16), true);
    this.view.setUint32(offset + 24, parseInt(value.slice(24, 32), 16), true);
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

  string(offset: number, value: string): void {
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
