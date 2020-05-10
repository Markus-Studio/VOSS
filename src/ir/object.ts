import { IRType } from './type';
import {
  fastPow2Log2,
  nextNumberDivisibleByPowOfTwo,
  toPascalCase,
  toCamelCase,
  toSnakeCase,
} from '../utils';
import { IRView } from './view';
import { IRObjectField } from './field';
import memorize from 'memorize-decorator';

export class IRObject {
  private fields = new Map<string, IRObjectField>();
  private views = new Map<string, IRView>();
  private subjectedViews = new Set<IRView>();
  private maxElementSize = 0;
  private maxElementAlignment = 0;

  private nextOffsetStart = 0;

  constructor(
    readonly isRoot: boolean,
    readonly id: number,
    readonly name: string
  ) {
    if (isRoot)
      this.addField(new IRObjectField('uuid', IRType.Primitive('hash16')));
  }

  private getNextOffset(size: number, align: number = size): number {
    let offset = this.nextOffsetStart;
    if (align > 1) {
      const pow = fastPow2Log2(align);
      offset = nextNumberDivisibleByPowOfTwo(offset, pow);
    }
    this.nextOffsetStart = offset + size;
    if (size > this.maxElementSize) {
      this.maxElementSize = size;
    }
    if (align > this.maxElementAlignment) {
      this.maxElementAlignment = align;
    }
    return offset;
  }

  addField(field: IRObjectField) {
    const name = field.name;
    if (this.fields.has(name))
      throw new Error(`Field ${name} already exists on object ${this.name}.`);

    const currentNextOffsetStart = this.nextOffsetStart;
    const offset = this.getNextOffset(field.type.size, field.type.align);
    this.fields.set(name, field);
    try {
      field.attach(this, offset);
    } catch (e) {
      this.nextOffsetStart = currentNextOffsetStart;
      this.fields.delete(name);
      throw e;
    }
  }

  getField(name: string): IRObjectField | undefined {
    return this.fields.get(name);
  }

  getFields(): Iterable<IRObjectField> {
    return this.fields.values();
  }

  getSize(): number {
    return this.nextOffsetStart;
  }

  getMaxElementSize(): number {
    return this.maxElementSize;
  }

  getMaxElementAlignment(): number {
    return this.maxElementAlignment;
  }

  protected ensureViewAccess() {
    if (!this.isRoot) throw new Error('Views are only for root object types.');
  }

  addView(view: IRView) {
    this.ensureViewAccess();

    const name = view.name;
    if (this.views.has(name))
      throw new Error(`View ${name} already exists on object ${this.name}`);

    this.views.set(name, view);
    try {
      view.attach(this);
    } catch (e) {
      this.views.delete(name);
      throw e;
    }
  }

  addSubjectedViewInternal(view: IRView) {
    this.ensureViewAccess();
    this.subjectedViews.add(view);
  }

  getView(name: string): IRView | undefined {
    this.ensureViewAccess();
    return this.views.get(name);
  }

  getViews(): Iterable<IRView> {
    this.ensureViewAccess();
    return this.views.values();
  }

  getSubjectedViews(): Iterable<IRView> {
    this.ensureViewAccess();
    return this.subjectedViews.values();
  }

  hasView(): boolean {
    this.ensureViewAccess();
    return this.views.size > 0;
  }

  isViewed(): boolean {
    this.ensureViewAccess();
    return this.subjectedViews.size > 0;
  }

  getType(): IRType {
    return IRType.Object(this);
  }

  @memorize()
  get pascalCase() {
    return toPascalCase(this.name);
  }

  @memorize()
  get camelCase() {
    return toCamelCase(this.name);
  }

  @memorize()
  get snakeCase() {
    return toSnakeCase(this.name);
  }

  @memorize()
  rpcGetCreateCase() {
    return 'Create' + this.pascalCase;
  }

  @memorize()
  rpcGetCreateMsg() {
    return this.rpcGetCreateCase() + 'Message';
  }

  @memorize()
  rpcGetFetchAllCase() {
    return 'FetchAll' + this.pascalCase;
  }

  @memorize()
  rpcGetFetchAllMsg() {
    return this.rpcGetFetchAllCase() + 'Message';
  }
}
