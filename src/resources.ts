import { join, dirname } from 'path';
import { readFileSync } from 'fs';

let base: string | null = null;

function getBase() {
  if (base) return base;
  if (__filename.endsWith('.ts')) {
    return (base = join(dirname(__filename), '../resources'));
  } else {
    return (base = join(dirname(__filename), '../../resources'));
  }
}

export function load(name: string): string {
  return readFileSync(join(getBase(), name), 'utf-8');
}
