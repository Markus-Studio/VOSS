import { parse } from './parser';

console.time('parse');
const tree = parse(`
struct S {
  data:int;
}

oneof t {
  A
}

object X {
  a: [int, [float, b], c];
}

`);
console.timeEnd('parse');

console.log(JSON.stringify(tree, null, 2));
