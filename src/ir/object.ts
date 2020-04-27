import { IRType } from './type';

export class IRObject {
  private fields = new Map<string, IRObjectField>();
  private views = new Map<string, IRView>();
  private subjectedViews = new Set<IRView>();
  private maxElementSize = 0;

  private nextOffsetStart = 0;

  constructor(
    readonly isRoot: boolean,
    readonly id: number,
    readonly name: string
  ) {
    if (isRoot)
      this.addField(new IRObjectField('uuid', IRType.Primitive('uuid')));
  }

  private getNextOffset(size: number, align: number = size): number {
    let offset = this.nextOffsetStart;
    if (align > 1) {
      const pow = fastSqrtTwo(align);
      offset = nextNumberDividableByPowOfTwo(offset, pow);
    }
    this.nextOffsetStart = offset + size;
    if (size > this.maxElementSize) {
      this.maxElementSize = size;
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
}

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

  isViewed(): boolean {
    return this.subjectedViews.size > 0;
  }

  getSubjectedViews(): Iterable<IRView> {
    return this.subjectedViews.values();
  }
}

// object Host {
//   @View(target, via) name;
// }
export class IRView {
  private host?: IRObject;
  readonly target: IRObject;

  constructor(readonly name: string, readonly via: IRObjectField) {
    this.target = via.getOwner();
    if (!this.target.isRoot) {
      throw new Error('Views are only for root objects.');
    }
  }

  attach(host: IRObject): void {
    if (this.host) throw new Error('View is already attached to another host.');
    if (host.getView(this.name) !== this)
      throw new Error('Illegal view attach attempt.');
    this.host = host;
    this.via.addViewInternal(this);
  }

  isAttached(): boolean {
    return !!this.host;
  }

  getHost(): IRObject {
    if (!this.host) throw new Error('View is not attached yet.');
    return this.host;
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
