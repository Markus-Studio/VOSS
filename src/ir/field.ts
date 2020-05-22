import { IRObject } from './object';
import { IRView } from './view';
import { IRType } from './type';
import { toPascalCase, toCamelCase, toSnakeCase } from '../utils';
import memorize from 'memorize-decorator';

export class IRObjectField {
  private owner?: IRObject;
  private offset: number = NaN;
  private subjectedViews = new Set<IRView>();

  constructor(readonly name: string, readonly type: IRType) {}

  attach(object: IRObject, offset: number): void {
    if (this.owner) throw new Error('Field is already attached.');
    if (object.getField(this.name) !== this)
      throw new Error('Illegal attach attempt.');

    this.owner = object;
    this.offset = offset;
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

  getOwner(): IRObject {
    if (!this.isAttached()) {
      throw new Error('Field is not attached.');
    }
    return this.owner!;
  }

  addViewInternal(view: IRView) {
    if (!this.owner)
      throw new Error('Cannot add view on field. error: not attached.');
    this.subjectedViews.add(view);
    try {
      this.owner.addSubjectedViewInternal(view);
    } catch (e) {
      this.subjectedViews.delete(view);
    }
  }

  get isViewed(): boolean {
    return this.subjectedViews.size > 0;
  }

  getSubjectedViews(): Iterable<IRView> {
    return this.subjectedViews.values();
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
  rpcGetSetCase() {
    return 'Object' + this.owner!.pascalCase + 'Set' + this.pascalCase;
  }

  @memorize()
  rpcGetSetMsg() {
    return this.rpcGetSetCase() + 'Message';
  }

  @memorize()
  rpcGetFetchViewCase() {
    return 'Fetch' + this.owner!.pascalCase + this.pascalCase;
  }

  @memorize()
  rpcGetFetchViewMsg() {
    return this.rpcGetFetchViewCase() + 'Message';
  }
}
