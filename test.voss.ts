// VOSS AUTOGENERATED FILE, DO NOT MODIFY.

import {
  Builder,
  ChangeNotifier,
  DeserializeFn,
  EnumCase,
  IChangeNotifier,
  Reader,
  Struct
} from './runtime';
type UUID = string;

export interface Test$Data {
  uuid: UUID,
  value: number,
  number: number,
  x: number,
}

export class Test extends IChangeNotifier implements Struct, ChangeNotifier {
  readonly maxElementAlignment = 8;
  readonly size = 36;

  constructor(private data: Test$Data) {
    super();
  }

  getUuid() {
    return this.data.uuid;
  }

  getValue() {
    return this.data.value;
  }

  setValue() {
    throw new Error('Not Implemented.');
  }

  getNumber() {
    return this.data.number;
  }

  setNumber() {
    throw new Error('Not Implemented.');
  }

  getX() {
    return this.data.x;
  }

  setX() {
    throw new Error('Not Implemented.');
  }

  patch(patch: Partial<Test$Data>): void {
    this.data = {...this.data, ...patch};
    this.emitChange();
  }

  serialize(builder: Builder) {
    builder.uuid(0, this.data.uuid);
    builder.i32(16, this.data.value);
    builder.f64(24, this.data.number);
    builder.i32(32, this.data.x);
  }

  static deserialize(reader: Reader) {
    return new Test({
        uuid: reader.uuid(0),
        value: reader.i32(16),
        number: reader.f64(24),
        x: reader.i32(32),
    });
  }
}

export interface Person$Data {
  uuid: UUID,
  name: string,
}

export class Person extends IChangeNotifier implements Struct, ChangeNotifier {
  readonly maxElementAlignment = 4;
  readonly size = 24;

  constructor(private data: Person$Data) {
    super();
  }

  getUuid() {
    return this.data.uuid;
  }

  getName() {
    return this.data.name;
  }

  setName() {
    throw new Error('Not Implemented.');
  }

  patch(patch: Partial<Person$Data>): void {
    this.data = {...this.data, ...patch};
    this.emitChange();
  }

  serialize(builder: Builder) {
    builder.uuid(0, this.data.uuid);
    builder.str(16, this.data.name);
  }

  static deserialize(reader: Reader) {
    return new Person({
        uuid: reader.uuid(0),
        name: reader.str(16),
    });
  }
}

export interface Point3D$Data {
  x: number,
  y: number,
  z: number,
}

export class Point3D implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 24;

  constructor(private data: Point3D$Data) {
  }

  getX() {
    return this.data.x;
  }

  setX(value: number): Point3D {
    return new Point3D({...this.data, x: value});
  }

  getY() {
    return this.data.y;
  }

  setY(value: number): Point3D {
    return new Point3D({...this.data, y: value});
  }

  getZ() {
    return this.data.z;
  }

  setZ(value: number): Point3D {
    return new Point3D({...this.data, z: value});
  }

  serialize(builder: Builder) {
    builder.f64(0, this.data.x);
    builder.f64(8, this.data.y);
    builder.f64(16, this.data.z);
  }

  static deserialize(reader: Reader) {
    return new Point3D({
        x: reader.f64(0),
        y: reader.f64(8),
        z: reader.f64(16),
    });
  }
}

export interface Point2D$Data {
  x: number,
  y: number,
}

export class Point2D implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 16;

  constructor(private data: Point2D$Data) {
  }

  getX() {
    return this.data.x;
  }

  setX(value: number): Point2D {
    return new Point2D({...this.data, x: value});
  }

  getY() {
    return this.data.y;
  }

  setY(value: number): Point2D {
    return new Point2D({...this.data, y: value});
  }

  serialize(builder: Builder) {
    builder.f64(0, this.data.x);
    builder.f64(8, this.data.y);
  }

  static deserialize(reader: Reader) {
    return new Point2D({
        x: reader.f64(0),
        y: reader.f64(8),
    });
  }
}

export interface _ClockData$Data {
  timestamp: number,
}

export class _ClockData implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 8;

  constructor(private data: _ClockData$Data) {
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ClockData {
    return new _ClockData({...this.data, timestamp: value});
  }

  serialize(builder: Builder) {
    builder.f64(0, this.data.timestamp);
  }

  static deserialize(reader: Reader) {
    return new _ClockData({
        timestamp: reader.f64(0),
    });
  }
}

export interface _ReplyData$Data {
  replyId: number,
}

export class _ReplyData implements Struct {
  readonly maxElementAlignment = 4;
  readonly size = 4;

  constructor(private data: _ReplyData$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ReplyData {
    return new _ReplyData({...this.data, replyId: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
  }

  static deserialize(reader: Reader) {
    return new _ReplyData({
        replyId: reader.u32(0),
    });
  }
}

export interface _RootFetchTestRequest$Data {
  replyId: number,
}

export class _RootFetchTestRequest implements Struct {
  readonly maxElementAlignment = 4;
  readonly size = 4;

  constructor(private data: _RootFetchTestRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _RootFetchTestRequest {
    return new _RootFetchTestRequest({...this.data, replyId: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
  }

  static deserialize(reader: Reader) {
    return new _RootFetchTestRequest({
        replyId: reader.u32(0),
    });
  }
}

export interface _ObjectTestSetValueRequest$Data {
  replyId: number,
  timestamp: number,
  previousValue: number,
  newValue: number,
}

export class _ObjectTestSetValueRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 24;

  constructor(private data: _ObjectTestSetValueRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectTestSetValueRequest {
    return new _ObjectTestSetValueRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectTestSetValueRequest {
    return new _ObjectTestSetValueRequest({...this.data, timestamp: value});
  }

  getPreviousValue() {
    return this.data.previousValue;
  }

  setPreviousValue(value: number): _ObjectTestSetValueRequest {
    return new _ObjectTestSetValueRequest({...this.data, previousValue: value});
  }

  getNewValue() {
    return this.data.newValue;
  }

  setNewValue(value: number): _ObjectTestSetValueRequest {
    return new _ObjectTestSetValueRequest({...this.data, newValue: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.i32(16, this.data.previousValue);
    builder.i32(20, this.data.newValue);
  }

  static deserialize(reader: Reader) {
    return new _ObjectTestSetValueRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        previousValue: reader.i32(16),
        newValue: reader.i32(20),
    });
  }
}

export interface _ObjectTestSetNumberRequest$Data {
  replyId: number,
  timestamp: number,
  previousValue: number,
  newValue: number,
}

export class _ObjectTestSetNumberRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectTestSetNumberRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectTestSetNumberRequest {
    return new _ObjectTestSetNumberRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectTestSetNumberRequest {
    return new _ObjectTestSetNumberRequest({...this.data, timestamp: value});
  }

  getPreviousValue() {
    return this.data.previousValue;
  }

  setPreviousValue(value: number): _ObjectTestSetNumberRequest {
    return new _ObjectTestSetNumberRequest({...this.data, previousValue: value});
  }

  getNewValue() {
    return this.data.newValue;
  }

  setNewValue(value: number): _ObjectTestSetNumberRequest {
    return new _ObjectTestSetNumberRequest({...this.data, newValue: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.f64(16, this.data.previousValue);
    builder.f64(24, this.data.newValue);
  }

  static deserialize(reader: Reader) {
    return new _ObjectTestSetNumberRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        previousValue: reader.f64(16),
        newValue: reader.f64(24),
    });
  }
}

export interface _ObjectTestSetXRequest$Data {
  replyId: number,
  timestamp: number,
  previousValue: number,
  newValue: number,
}

export class _ObjectTestSetXRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 24;

  constructor(private data: _ObjectTestSetXRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectTestSetXRequest {
    return new _ObjectTestSetXRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectTestSetXRequest {
    return new _ObjectTestSetXRequest({...this.data, timestamp: value});
  }

  getPreviousValue() {
    return this.data.previousValue;
  }

  setPreviousValue(value: number): _ObjectTestSetXRequest {
    return new _ObjectTestSetXRequest({...this.data, previousValue: value});
  }

  getNewValue() {
    return this.data.newValue;
  }

  setNewValue(value: number): _ObjectTestSetXRequest {
    return new _ObjectTestSetXRequest({...this.data, newValue: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.i32(16, this.data.previousValue);
    builder.i32(20, this.data.newValue);
  }

  static deserialize(reader: Reader) {
    return new _ObjectTestSetXRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        previousValue: reader.i32(16),
        newValue: reader.i32(20),
    });
  }
}

export interface _ObjectTestDeleteRequest$Data {
  replyId: number,
  timestamp: number,
  uuid: UUID,
}

export class _ObjectTestDeleteRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectTestDeleteRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectTestDeleteRequest {
    return new _ObjectTestDeleteRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectTestDeleteRequest {
    return new _ObjectTestDeleteRequest({...this.data, timestamp: value});
  }

  getUuid() {
    return this.data.uuid;
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.uuid(16, this.data.uuid);
  }

  static deserialize(reader: Reader) {
    return new _ObjectTestDeleteRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        uuid: reader.uuid(16),
    });
  }
}

export interface _ObjectTestCreateRequest$Data {
  replyId: number,
  timestamp: number,
  data: UUID,
}

export class _ObjectTestCreateRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectTestCreateRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectTestCreateRequest {
    return new _ObjectTestCreateRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectTestCreateRequest {
    return new _ObjectTestCreateRequest({...this.data, timestamp: value});
  }

  fetchData(): Promise<Test> {
    const session = VossSession.getSessionOf(this);
    return session.fetchObjectByUUID(this.data.data);
  }

  setData(value: Test): _ObjectTestCreateRequest {
    return new _ObjectTestCreateRequest({...this.data, data: value.getUuid()});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.uuid(16, this.data.data);
  }

  static deserialize(reader: Reader) {
    return new _ObjectTestCreateRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        data: reader.uuid(16),
    });
  }
}

export interface _RootFetchPersonRequest$Data {
  replyId: number,
}

export class _RootFetchPersonRequest implements Struct {
  readonly maxElementAlignment = 4;
  readonly size = 4;

  constructor(private data: _RootFetchPersonRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _RootFetchPersonRequest {
    return new _RootFetchPersonRequest({...this.data, replyId: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
  }

  static deserialize(reader: Reader) {
    return new _RootFetchPersonRequest({
        replyId: reader.u32(0),
    });
  }
}

export interface _ObjectPersonSetNameRequest$Data {
  replyId: number,
  timestamp: number,
  previousValue: string,
  newValue: string,
}

export class _ObjectPersonSetNameRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectPersonSetNameRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectPersonSetNameRequest {
    return new _ObjectPersonSetNameRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectPersonSetNameRequest {
    return new _ObjectPersonSetNameRequest({...this.data, timestamp: value});
  }

  getPreviousValue() {
    return this.data.previousValue;
  }

  setPreviousValue(value: string): _ObjectPersonSetNameRequest {
    return new _ObjectPersonSetNameRequest({...this.data, previousValue: value});
  }

  getNewValue() {
    return this.data.newValue;
  }

  setNewValue(value: string): _ObjectPersonSetNameRequest {
    return new _ObjectPersonSetNameRequest({...this.data, newValue: value});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.str(16, this.data.previousValue);
    builder.str(24, this.data.newValue);
  }

  static deserialize(reader: Reader) {
    return new _ObjectPersonSetNameRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        previousValue: reader.str(16),
        newValue: reader.str(24),
    });
  }
}

export interface _ObjectPersonDeleteRequest$Data {
  replyId: number,
  timestamp: number,
  uuid: UUID,
}

export class _ObjectPersonDeleteRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectPersonDeleteRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectPersonDeleteRequest {
    return new _ObjectPersonDeleteRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectPersonDeleteRequest {
    return new _ObjectPersonDeleteRequest({...this.data, timestamp: value});
  }

  getUuid() {
    return this.data.uuid;
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.uuid(16, this.data.uuid);
  }

  static deserialize(reader: Reader) {
    return new _ObjectPersonDeleteRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        uuid: reader.uuid(16),
    });
  }
}

export interface _ObjectPersonCreateRequest$Data {
  replyId: number,
  timestamp: number,
  data: UUID,
}

export class _ObjectPersonCreateRequest implements Struct {
  readonly maxElementAlignment = 8;
  readonly size = 32;

  constructor(private data: _ObjectPersonCreateRequest$Data) {
  }

  getReplyId() {
    return this.data.replyId;
  }

  setReplyId(value: number): _ObjectPersonCreateRequest {
    return new _ObjectPersonCreateRequest({...this.data, replyId: value});
  }

  getTimestamp() {
    return this.data.timestamp;
  }

  setTimestamp(value: number): _ObjectPersonCreateRequest {
    return new _ObjectPersonCreateRequest({...this.data, timestamp: value});
  }

  fetchData(): Promise<Person> {
    const session = VossSession.getSessionOf(this);
    return session.fetchObjectByUUID(this.data.data);
  }

  setData(value: Person): _ObjectPersonCreateRequest {
    return new _ObjectPersonCreateRequest({...this.data, data: value.getUuid()});
  }

  serialize(builder: Builder) {
    builder.u32(0, this.data.replyId);
    builder.f64(8, this.data.timestamp);
    builder.uuid(16, this.data.data);
  }

  static deserialize(reader: Reader) {
    return new _ObjectPersonCreateRequest({
        replyId: reader.u32(0),
        timestamp: reader.f64(8),
        data: reader.uuid(16),
    });
  }
}

export const enum Point$Type {
  Point2D = 0,
  Point3D = 1,
}

export type Point =
  | EnumCase<Point$Type.Point2D, Point2D>
  | EnumCase<Point$Type.Point3D, Point3D>
  ;

export const Point$DeserializerMap: Record<Point$Type, DeserializeFn<any>> = {
  [Point$Type.Point2D]: Point2D.deserialize,
  [Point$Type.Point3D]: Point3D.deserialize,
}

export const enum _RPCMessage$Type {
  Clock = 0,
  Reply = 1,
  RootFetchTest = 8706,
  ObjectTestSetValue = 8708,
  ObjectTestSetNumber = 16785924,
  ObjectTestSetX = 33563140,
  ObjectTestDelete = 8710,
  ObjectTestCreate = 8709,
  RootFetchPerson = 8450,
  ObjectPersonSetName = 8452,
  ObjectPersonDelete = 8454,
  ObjectPersonCreate = 8453,
}

export type _RPCMessage =
  | EnumCase<_RPCMessage$Type.Clock, _ClockData>
  | EnumCase<_RPCMessage$Type.Reply, _ReplyData>
  | EnumCase<_RPCMessage$Type.RootFetchTest, _RootFetchTestRequest>
  | EnumCase<_RPCMessage$Type.ObjectTestSetValue, _ObjectTestSetValueRequest>
  | EnumCase<_RPCMessage$Type.ObjectTestSetNumber, _ObjectTestSetNumberRequest>
  | EnumCase<_RPCMessage$Type.ObjectTestSetX, _ObjectTestSetXRequest>
  | EnumCase<_RPCMessage$Type.ObjectTestDelete, _ObjectTestDeleteRequest>
  | EnumCase<_RPCMessage$Type.ObjectTestCreate, _ObjectTestCreateRequest>
  | EnumCase<_RPCMessage$Type.RootFetchPerson, _RootFetchPersonRequest>
  | EnumCase<_RPCMessage$Type.ObjectPersonSetName, _ObjectPersonSetNameRequest>
  | EnumCase<_RPCMessage$Type.ObjectPersonDelete, _ObjectPersonDeleteRequest>
  | EnumCase<_RPCMessage$Type.ObjectPersonCreate, _ObjectPersonCreateRequest>
  ;

export const _RPCMessage$DeserializerMap: Record<_RPCMessage$Type, DeserializeFn<any>> = {
  [_RPCMessage$Type.Clock]: _ClockData.deserialize,
  [_RPCMessage$Type.Reply]: _ReplyData.deserialize,
  [_RPCMessage$Type.RootFetchTest]: _RootFetchTestRequest.deserialize,
  [_RPCMessage$Type.ObjectTestSetValue]: _ObjectTestSetValueRequest.deserialize,
  [_RPCMessage$Type.ObjectTestSetNumber]: _ObjectTestSetNumberRequest.deserialize,
  [_RPCMessage$Type.ObjectTestSetX]: _ObjectTestSetXRequest.deserialize,
  [_RPCMessage$Type.ObjectTestDelete]: _ObjectTestDeleteRequest.deserialize,
  [_RPCMessage$Type.ObjectTestCreate]: _ObjectTestCreateRequest.deserialize,
  [_RPCMessage$Type.RootFetchPerson]: _RootFetchPersonRequest.deserialize,
  [_RPCMessage$Type.ObjectPersonSetName]: _ObjectPersonSetNameRequest.deserialize,
  [_RPCMessage$Type.ObjectPersonDelete]: _ObjectPersonDeleteRequest.deserialize,
  [_RPCMessage$Type.ObjectPersonCreate]: _ObjectPersonCreateRequest.deserialize,
}
