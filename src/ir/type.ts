import { IRObject } from './object';
import { IREnum } from './enum';

export type PrimitiveTypeName =
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

const PrimitiveTypeSizeTable: Record<PrimitiveTypeName, number> = Object.assign(
  Object.create(null),
  {
    i8: 1,
    i16: 2,
    i32: 4,
    u8: 1,
    u16: 2,
    u32: 4,
    f32: 4,
    f64: 8,
    bool: 1,
    // For strings we store a relative offset to the beginning as a U32 integer.
    str: 4,
  }
);

export class IRType {
  readonly isPrimitive: boolean;

  private constructor(
    readonly name: string,
    readonly size: number,
    readonly target?: IRObject | IREnum,
    readonly align: number = size
  ) {
    this.isPrimitive = !target;
  }

  static Primitive(name: PrimitiveTypeName): IRType {
    const size = PrimitiveTypeSizeTable[name];
    return new IRType(name, size);
  }

  static Object(object: IRObject) {
    return new IRType(object.name, 4, object);
  }

  static Enum(irEnum: IREnum) {
    // An enum has 2 U32 and there is no padding between two consecutive
    // fields of the same type in an struct, but setting the size to 8 here
    // will force the struct builder to find an offset for the enum that is
    // dividable by 8 (one big U64) instead of 4 which is the correct offset,
    // so here we set the align explicitly to 4.
    return new IRType(irEnum.name, 8, irEnum, 4);
  }

  static isPrimitive(name: string): name is PrimitiveTypeName {
    return name in PrimitiveTypeSizeTable;
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
