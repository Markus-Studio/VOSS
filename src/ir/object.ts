import { IRType } from './type';
import { Program } from './program';

export class IRObject {
  private fields = new Map<string, IRObjectField>();
  private nextOffsetStart = 0;

  constructor(
    readonly isRoot: boolean,
    readonly id: number,
    readonly name: string
  ) {}

  private getNextOffset(size: number, align: number = size): number {
    let offset = this.nextOffsetStart;
    if (align > 1) {
      const pow = fastSqrtTwo(align);
      offset = nextNumberDividableByPowOfTwo(offset, pow);
    }
    this.nextOffsetStart = offset + size;
    return offset;
  }

  addField(field: IRObjectField) {
    if (this.fields.has(field.name))
      throw new Error(
        `Field ${field.name} already exists on object ${this.name}.`
      );

    const offset = this.getNextOffset(field.type.size, field.type.align);
    this.fields.set(field.name, field);
    field.attach(this, offset);
  }

  getField(name: string): IRObjectField | undefined {
    return this.fields.get(name);
  }

  getFields(): Iterable<IRObjectField> {
    return this.fields.values();
  }

  getSize() {
    return this.nextOffsetStart;
  }
}

export class IRObjectField {
  private owner?: IRObject;
  private offset: number = NaN;

  constructor(readonly name: string, readonly type: IRType) {}

  attach(object: IRObject, offset: number): void {
    if (this.owner) throw new Error('Field is already attached.');
    if (object.getField(this.name) !== this)
      throw new Error('Illegal attach attempt.');

    this.owner = object;
    this.offset = offset;
    console.log(this.name, offset);
  }

  isAttached(): boolean {
    return !!this.owner;
  }

  getOffset(): number {
    if (!this.isAttached()) {
      throw new Error('Field is not attached.');
    }
    return this.offset;
  }
}

function nextNumberDividableByPowOfTwo(number: number, pow: number): number {
  const n = (number >> pow) << pow;
  if (n === number) return n;
  return n + (1 << pow);
}

function fastSqrtTwo(n: number): number {
  let i = 0;
  for (; n; n >>= 1) {
    i++;
  }
  return i - 1;
}
