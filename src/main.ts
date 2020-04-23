import { parse } from './parser';

const tree = parse(`
struct S {
  data:int;
}

oneof t {
  A
}

`);
console.log(JSON.stringify(tree, null, 2));
