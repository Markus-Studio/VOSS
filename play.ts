import { _RPCMessage$DeserializerMap } from './test-voss';
import { IReader } from './runtime/reader';

const rust = IReader.DeserializeEnum(
  new Uint8Array([
    0, 0, 0, 0, 4, 0, 0, 0, 205, 204, 204, 204, 12, 36, 254, 64
  ]).buffer,
  _RPCMessage$DeserializerMap
);

console.log(JSON.stringify(rust));