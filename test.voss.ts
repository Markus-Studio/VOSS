// VOSS AUTOGENERATED FILE, DO NOT MODIFY.

import {
  Builder,
  EnumCase,
  Reader,
  Struct
} from './runtime';
type UUID = string;

export class T implements Struct {
  readonly _maxElementAlignment = 1;
  readonly _size = 16;
  constructor(
    readonly $session: VossSession,
    private __uuid: UUID,
  ) {}

  get uuid() {
    return this.__uuid;
  }

  _serialize(builder: Builder) {
    builder.uuid(0, this.__uuid);
  }

  static deserialize(session: VossSession, reader: Reader) {
    return new T(
      session,
      reader.uuid(0),
    );
  }
}

export class A implements Struct {
  readonly _maxElementAlignment = 4;
  readonly _size = 21;
  constructor(
    readonly $session: VossSession,
    private __s: number,
    private __t: UUID,
    private __p: number,
  ) {}

  get s() {
    return this.__s;
  }

  fetchT(): Promise<T> {
    return this.$session.fetchObjectByUUID(this.__t);
  }

  get p() {
    return this.__p;
  }

  _serialize(builder: Builder) {
    builder.i32(0, this.__s);
    builder.uuid(4, this.__t);
    builder.u8(20, this.__p);
  }

  static deserialize(session: VossSession, reader: Reader) {
    return new A(
      session,
      reader.i32(0),
      reader.uuid(4),
      reader.u8(20),
    );
  }
}

export class _ClockData implements Struct {
  readonly _maxElementAlignment = 8;
  readonly _size = 8;
  constructor(
    readonly $session: VossSession,
    private __timestamp: number,
  ) {}

  get timestamp() {
    return this.__timestamp;
  }

  _serialize(builder: Builder) {
    builder.f64(0, this.__timestamp);
  }

  static deserialize(session: VossSession, reader: Reader) {
    return new _ClockData(
      session,
      reader.f64(0),
    );
  }
}

export class _RootFetchTRequest implements Struct {
  readonly _maxElementAlignment = 0;
  readonly _size = 0;
  constructor(
    readonly $session: VossSession,
  ) {}

  _serialize(builder: Builder) {
  }

  static deserialize(session: VossSession, reader: Reader) {
    return new _RootFetchTRequest(
      session,
    );
  }
}