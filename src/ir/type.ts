import { IRObject } from './object';
import { IREnum } from './enum';
import memorize from 'memorize-decorator';
import { toPascalCase, toCamelCase, toSnakeCase } from '../utils';

export type PrimitiveTypeName =
  | 'hash16'
  | 'hash20'
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

/**
 * Map name of each primitive type to it's size and alignment.
 * The value is either:
 *  - number: size and alignment are the same.
 *  - [size, alignment]
 */
const PrimitiveTypeSizeTable: Record<
  PrimitiveTypeName,
  number | [number, number]
> = Object.assign(Object.create(null), {
  hash16: [16, 1],
  hash20: [20, 1],
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

/**
 * The IRType class is used to represent different data types, mostly used
 * in object fields, it can be either a primitive type, a reference to an
 * object, struct or an enum.
 *
 * IRType is immutable.
 */
export class IRType {
  /**
   * This property indicates if a type is a primitive type, such as
   * str, u8, u32, etc. or a reference, when this property is false,
   * IRType.target is guaranteed to contain a non-null value.
   */
  readonly isPrimitive: boolean;

  private constructor(
    /**
     * Name of type, if the type is not primitive, it must be the same as
     * target.name.
     */
    readonly name: string,
    /**
     * The size that this type requires, for non-primitive types such as
     * structures and enums it is equal to their reference size, and not
     * the content size, and for (root) objects it is enough to contain
     * an HASH16.
     */
    readonly size: number,
    /**
     * The memory alignment required to store this type in an struct, it
     * must be a power of two, greater than 0, the offset of a field in
     * an struct is calculated in such a way that:
     *
     * Offset ≡ 0 (mod Alignment)
     */
    readonly align: number = size,
    /**
     * If it is a non-primitive type, this property contains the reference.
     */
    readonly target?: IRObject | IREnum
  ) {
    this.isPrimitive = !target;
    if (target && target.name !== name) {
      throw new Error('Type name must be the same as targets name.');
    }
  }

  /**
   * Constructs and returns a new primitive IRType with the given name.
   *
   * @param name Name of the primitive type.
   */
  static Primitive(name: PrimitiveTypeName): IRType {
    const data = PrimitiveTypeSizeTable[name];
    const [size, align] = typeof data === 'number' ? [data, data] : data;
    return new IRType(name, size, align);
  }

  /**
   * Constructs and returns a new IRType refereeing to an object type.
   *
   * @param object The reference object.
   */
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

  /**
   * Constructs and returns a new IRType refereeing to an enum (oneof).
   *
   * @param irEnum The reference enum.
   */
  static Enum(irEnum: IREnum) {
    // An enum has 2 U32 and there is no padding between two consecutive
    // fields of the same type in an struct, but setting the alignment to
    // 8 here will force the struct builder to find an offset for the enum
    // that is divisible by 8 (one big U64) instead of 4 which is the
    // correct alignment, so here we set the align explicitly to 4.
    return new IRType(irEnum.name, 8, 4, irEnum);
  }

  /**
   * Returns true if the given name is a valid VOSS primitive type name.
   *
   * @param name Name which you want to check.
   */
  static isPrimitive(name: string): name is PrimitiveTypeName {
    return name in PrimitiveTypeSizeTable;
  }

  /**
   * Tries to return name of this type as a PrimitiveTypeName, throws an
   * error if the type is not a primitive.
   */
  asPrimitiveName(): PrimitiveTypeName {
    if (!this.isPrimitive) {
      throw new Error('Type is not a primitive.');
    }
    return this.name as any;
  }

  /**
   * Tries to return the `target` as an IRObject, throws an error if it
   * fails.
   */
  asObject(): IRObject {
    if (this.target && this.target instanceof IRObject) {
      return this.target;
    }
    throw new Error('Type is not an object.');
  }

  /**
   * Tries to return `target` as an IREnum, throw an error if the type
   * is anything but an enum.
   */
  asEnum(): IREnum {
    if (this.target && this.target instanceof IREnum) {
      return this.target;
    }
    throw new Error('Type is not an enum.');
  }

  /**
   * Holds true if the type is an object, both `struct` and `object`.
   */
  get isObject(): boolean {
    return !!(this.target && this.target instanceof IRObject);
  }

  /**
   * True if the type is an `struct`, an IRObject which is not
   * root object.
   */
  get isStructure(): boolean {
    return this.isObject && !this.asObject().isRoot;
  }

  /**
   * Indicates whatever this type is a root object or not.
   */
  get isRootObject(): boolean {
    return this.isObject && this.asObject().isRoot;
  }

  /**
   * Holds true if the type is an enum reference.
   */
  get isEnum(): boolean {
    return !!(this.target && this.target instanceof IREnum);
  }

  /**
   * Returns name of this type in PascalCase.
   */
  @memorize()
  get pascalCase() {
    return toPascalCase(this.name);
  }

  /**
   * Returns name of this type in camelCase.
   */
  @memorize()
  get camelCase() {
    return toCamelCase(this.name);
  }

  /**
   * Returns name of this type in snake_case.
   */
  @memorize()
  get snakeCase() {
    return toSnakeCase(this.name);
  }
}
