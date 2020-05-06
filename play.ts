import { Point2D, Circle } from './test-voss';
import { IBuilder } from './runtime/builder';
import { IReader } from './runtime/reader';

const point = new Point2D({ uuid: "defbeb5761fbb0175a2c84d11968d6d6", x: 0.3, y: 0.5 });
const circle = new Circle({ uuid: "98c85eaee1263b6b59adcd6859280df3", name: 'Circle 1', radius: 12.5, center: point.getUuid() });
const data = IBuilder.SerializeStruct(circle);

console.log(data);

const decoded = IReader.DeserializeStruct(data.buffer, Circle.deserialize);

const rust = IReader.DeserializeStruct(
  new Uint8Array([
    152, 200, 94, 174, 225, 38, 59, 107, 89, 173, 205, 104, 89, 40, 13, 243,
    16, 0, 0, 0, 28, 0, 0, 0, 0, 0, 72, 65, 222, 251, 235, 87, 97, 251, 176,
    23, 90, 44, 132, 209, 25, 104, 214, 214, 67, 0, 105, 0, 114, 0, 99, 0,
    108, 0, 101, 0, 32, 0, 49, 0
  ]).buffer,
  Circle.deserialize
);

console.log('x'.repeat(data.byteLength))
console.log(JSON.stringify(circle));
console.log(JSON.stringify(decoded));
console.log(JSON.stringify(rust));