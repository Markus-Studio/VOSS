export interface EnumCase<
  T extends number = number,
  V extends Struct = Struct
> {
  readonly type: T;
  readonly value: V;
}

export interface ChangeNotifier {
  on(event: 'change', cb: () => void): void;
  off(event: 'change', cb: () => void): void;
}

export interface Builder {
  struct(offset: number, value: Struct): void;
  enum(offset: number, value: EnumCase): void;
  hash16(offset: number, value: string): void;
  hash20(offset: number, value: string): void;
  u8(offset: number, value: number): void;
  u16(offset: number, value: number): void;
  u32(offset: number, value: number): void;
  i8(offset: number, value: number): void;
  i16(offset: number, value: number): void;
  i32(offset: number, value: number): void;
  f32(offset: number, value: number): void;
  f64(offset: number, value: number): void;
  bool(offset: number, value: boolean): void;
  str(offset: number, value: string): void;
}

export type DeserializeFn<T> = (reader: Reader) => T;

export interface Reader {
  struct<T extends Struct>(offset: number, deserializer: DeserializeFn<T>): T;
  enum<T extends Struct>(
    offset: number,
    map: Record<number, DeserializeFn<T>>
  ): EnumCase<number, T>;
  hash16(offset: number): string;
  hash20(offset: number): string;
  u8(offset: number): number;
  u16(offset: number): number;
  u32(offset: number): number;
  i8(offset: number): number;
  i16(offset: number): number;
  i32(offset: number): number;
  f32(offset: number): number;
  f64(offset: number): number;
  bool(offset: number): boolean;
  str(offset: number): string;
}

export interface Struct {
  serialize(builder: Builder): void;
  equal(struct: Struct): boolean;
}

export interface StructStatic {
  readonly maxElementAlignment: number;
  readonly size: number;
}
