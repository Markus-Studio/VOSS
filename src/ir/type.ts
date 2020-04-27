import { IRObject } from './object';
import { IREnum } from './enum';

export type PrimitiveTypeName =
  | 'uuid'
  | 'i8'
  | 'i16'
  | 'i32'
  | 'u8'
  | 'u16'
  | 'u32'
  | 'f32'
  | 'f64'
  | 'bool'
  | 'str';

const PrimitiveTypeSizeTable: Record<
  PrimitiveTypeName,
  number | [number, number]
> = Object.assign(Object.create(null), {
  uuid: [16, 1],
  i8: 1,
  i16: 2,
  i32: 4,
  u8: 1,
  u16: 2,
  u32: 4,
  f32: 4,
  f64: 8,
  bool: 1,
  // Strings are stored as net-string, as a tuple (ByteLength, Offset), where
  // both are of type U32.
  str: [8, 4],
});

export class IRType {
  readonly isPrimitive: boolean;

  private constructor(
    readonly name: string,
    readonly size: number,
    readonly align: number = size,
    readonly target?: IRObject | IREnum
  ) {
    this.isPrimitive = !target;
    if (target && target.name !== name) {
      throw new Error('Type name must be the same as targets name.');
    }
  }

  static Primitive(name: PrimitiveTypeName): IRType {
    const data = PrimitiveTypeSizeTable[name];
    const [size, align] = typeof data === 'number' ? [data, data] : data;
    return new IRType(name, size, align);
  }

  static Object(object: IRObject) {
    if (object.isRoot) {
      // For root objects we store the UUID, which is char[16], so
      // it has the alignment of 1, and takes 16 bytes.
      return new IRType(object.name, 16, 1, object);
    } else {
      // For an struct we only store a relative offset to its content.
      return new IRType(object.name, 4, 4, object);
    }
  }

  static Enum(irEnum: IREnum) {
    // An enum has 2 U32 and there is no padding between two consecutive
    // fields of the same type in an struct, but setting the size to 8 here
    // will force the struct builder to find an offset for the enum that is
    // dividable by 8 (one big U64) instead of 4 which is the correct offset,
    // so here we set the align explicitly to 4.
    return new IRType(irEnum.name, 8, 4, irEnum);
  }

  static isPrimitive(name: string): name is PrimitiveTypeName {
    return name in PrimitiveTypeSizeTable;
  }

  asPrimitiveName(): PrimitiveTypeName {
    if (!this.isPrimitive) {
      throw new Error('Type is not a primitive.');
    }
    return this.name as any;
  }

  asObject(): IRObject {
    if (this.target && this.target instanceof IRObject) {
      return this.target;
    }
    throw new Error('Type is not an object.');
  }

  get isObject(): boolean {
    return !!(this.target && this.target instanceof IRObject);
  }

  get isStructure(): boolean {
    return this.isObject && !this.asObject().isRoot;
  }

  get isRootObject(): boolean {
    return this.isObject && this.asObject().isRoot;
  }

  asEnum(): IREnum {
    if (this.target && this.target instanceof IREnum) {
      return this.target;
    }
    throw new Error('Type is not an object.');
  }

  get isEnum(): boolean {
    return !!(this.target && this.target instanceof IREnum);
  }
}
