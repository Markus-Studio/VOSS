export interface EnumCase<T extends number, V extends Struct> {
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
  writeEnum(value: EnumCase<number, Struct>): void;
  writeStruct(value: Struct): void;
}

export interface Struct {
  maxElementSize: number;
  serialize(): void;
}