import { Point2D, Circle } from './test-voss';
import { IBuilder } from './runtime/builder';
import { IReader } from './runtime/reader';

const point = new Point2D({ x: 0.3, y: 0.5 });
const circle = new Circle({ name: 'Circle 1', radius: 12.5, center: point });
const data = IBuilder.SerializeStruct(circle);
console.log(data);

const decoded = IReader.DeserializeStruct(data.buffer, Circle.deserialize);

const rust = IReader.DeserializeStruct(
  new Uint8Array([
    16, 0, 0, 0, 16, 0, 0, 0, 0, 0, 72, 65, 20, 0, 0, 0, 67, 0,
    105, 0, 114, 0, 99, 0, 108, 0, 101, 0, 32, 0, 49, 0, 51, 51,
    51, 51, 51, 51, 211, 63, 0, 0, 0, 0, 0, 0, 224, 63
  ]).buffer,
  Circle.deserialize
);

console.log('x'.repeat(data.byteLength))
console.log(JSON.stringify(decoded));
console.log(JSON.stringify(rust));