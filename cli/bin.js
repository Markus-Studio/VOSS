#!/usr/bin/env node

const voss = require('../dist/src/lib');
const utils = require('../dist/src/utils');
const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const options = { input: null, ts: null, rs: null };

for (let i = 2; i < process.argv.length; ++i) {
  const arg = process.argv[i];
  switch (arg) {
    case '-ts':
      options.ts = process.argv[i + 1];
      i++;
      break;
    case '-rs':
      options.rs = process.argv[i + 1];
      i++;
      break;
    default:
      options.input = arg;
  }
}

if (!options.input) {
  console.error('usage: voss <filename> [-ts <filename>] [-rs <filename>]');
  process.exit(-1);
}

options.input = path.join(process.cwd(), options.input);

if (!options.ts || !options.rs) {
  const dirname = path.dirname(options.input);
  const filename = utils.toOutputName(path.basename(options.input));
  const out = path.join(dirname, filename);
  options.ts = options.ts || (out + '.ts');
  options.rs = options.rs || (out + '.rs');
}

// Read the input.
const source = fs.readFileSync(options.input, 'utf-8');

// Compile VOSS files.
function genIR(source) {
  const tree = voss.parse(source);
  try {
    return voss.genIR(tree);
  } catch (e) {
    console.error('Could not verify the source document.');
    console.error('Error: ' + e.message);
    process.exit(-1);
  }
}

console.time('voss time');
const program = genIR(source);
const typescriptSource = voss.generateTypescriptClient(program);
const rustSource = voss.generateRustServer(program);
console.timeEnd('voss time');

// Write outputs.
mkdirp.sync(path.dirname(options.ts));
fs.writeFileSync(options.ts, typescriptSource);
mkdirp.sync(path.dirname(options.rs));
fs.writeFileSync(options.rs, rustSource);
