export interface EnumCase<
  T extends number = number,
  V extends Struct = Struct
> {
  readonly type: T;
  readonly value: V;
}

export type LazyReference<T> = Promise<T | undefined>;

export interface ChangeNotifier {
  on(event: 'change', cb: () => void): void;
  off(event: 'change', cb: () => void): void;
}

export interface ReadonlyView<T> extends ChangeNotifier {
  readonly members: ReadonlyArray<T>;
}

export interface ReadonlyLazyView<T> extends ReadonlyView<T> {
  readonly isLoaded: boolean;
  load(): Promise<void>;
}

export interface Builder {
  struct(offset: number, value: Struct): void;
  enum(offset: number, value: EnumCase): void;
  uuid(offset: number, value: string): void;
  u8(offset: number, value: number): void;
  u16(offset: number, value: number): void;
  u32(offset: number, value: number): void;
  i8(offset: number, value: number): void;
  i16(offset: number, value: number): void;
  i32(offset: number, value: number): void;
  f32(offset: number, value: number): void;
  f64(offset: number, value: number): void;
  bool(offset: number, value: boolean): void;
  string(offset: number, value: string): void;
}

export interface Reader {
  uuid(offset: number): string;
  u8(offset: number): number;
  u16(offset: number): number;
  u32(offset: number): number;
  i8(offset: number): number;
  i16(offset: number): number;
  i32(offset: number): number;
  f32(offset: number): number;
  f64(offset: number): number;
}

export interface Struct {
  _maxElementAlignment: number;
  _size: number;
  _serialize(builder: Builder): void;
}
