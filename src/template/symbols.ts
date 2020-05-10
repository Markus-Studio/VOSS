import { isIdentifier } from './utils';

type Table = Map<string, any>;

export class SymbolTable {
  private readonly tables: Table[] = [new Map()];

  private peek(): Table {
    return this.tables[this.tables.length - 1];
  }

  bind(name: string, value: any): void {
    if (!isIdentifier(name)) {
      throw new Error('Symbol name must be a valid identifier.');
    }

    const table = this.peek();

    if (table.has(name)) {
      throw new Error(`Name ${name} is already defined.`);
    }

    table.set(name, value);
  }

  resolve(name: string): any {
    for (let i = this.tables.length - 1; i >= 0; --i) {
      if (this.tables[i].has(name)) {
        return this.tables[i].get(name);
      }
    }

    throw new Error(`Cannot resolve name ${name}.`);
  }

  push() {
    this.tables.push(new Map());
  }

  pop() {
    if (this.tables.length <= 1) throw new Error('Invalid symbol table pop.');
    this.tables.pop();
  }
}
