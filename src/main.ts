import { parse } from './parser';
import { TypeScriptBackend } from './ts';
import { PrettyWriter } from './pretty';
import { readFileSync } from 'fs';
import { join } from 'path';
import { build } from './ir';

const filename = process.argv[2] || 'test.voss';
if (!filename) {
  console.error(`usage: ${process.argv[0]} ${process.argv[1]} <filename>`);
  process.exit(-1);
}

const source = readFileSync(join(process.cwd(), filename), 'utf-8');
const tree = parse(source);
const program = build(tree);

debugger;

const writer = new PrettyWriter();
new TypeScriptBackend(writer, program);
console.log(writer.getSource());
