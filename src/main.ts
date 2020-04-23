import { parse } from './parser';

const tree = parse(`struct S {data:int;}`);
console.log(JSON.stringify(tree, null, 2));
