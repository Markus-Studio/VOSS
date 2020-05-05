import { parse } from './frontend/parser';
import { readFileSync, writeFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { genIR } from './ir/gen';
import { Program } from './ir/program';
import { generateTypescriptClient } from './backend/typescript';
import { generateRustServer } from './backend/rust';
import { toOutputName } from './utils';

const filename = process.argv[2] || 'test.voss';
if (!filename) {
  console.error(`usage: ${process.argv[0]} ${process.argv[1]} <filename>`);
  process.exit(-1);
}

const filePath = join(process.cwd(), filename);

const source = readFileSync(filePath, 'utf-8');
const tree = parse(source);
let program: Program;
try {
  program = genIR(tree);
} catch (e) {
  console.error('Could not verify the source document.');
  console.error('Error: ' + e.message);
  process.exit(-1);
}

const typescriptSource = generateTypescriptClient(program);
const rustSource = generateRustServer(program);
const outPath = join(dirname(filePath), toOutputName(basename(filePath)));
writeFileSync(outPath + '.ts', typescriptSource);
writeFileSync(outPath + '.rs', rustSource);
