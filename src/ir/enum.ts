import { IRType } from './type';

export class IREnum {
  private nextCaseValue = 0;
  private readonly cases = new Map<string, IREnumCase>();

  constructor(readonly id: number, readonly name: string) {}

  addCase(enumCase: IREnumCase) {
    const name = enumCase.name;
    if (this.cases.has(name))
      throw new Error(`Name ${name} is already in use.`);

    const value = this.nextCaseValue++;
    this.cases.set(name, enumCase);
    try {
      enumCase.attach(this, value);
    } catch (e) {
      this.nextCaseValue = value;
      this.cases.delete(name);
      throw e;
    }
  }

  getCase(name: string): IREnumCase | undefined {
    return this.cases.get(name);
  }

  getCases(): Iterable<IREnumCase> {
    return this.cases.values();
  }
}

export class IREnumCase {
  private owner?: IREnum;
  private value: number = NaN;

  constructor(readonly name: string, readonly type: IRType) {
    if (!this.type.isStructure) {
      throw new Error('EnumCase can only be of non-root structure type.');
    }
  }

  attach(owner: IREnum, value: number): void {
    if (this.owner)
      throw new Error(`Enum case ${this.name} is already attached.`);
    if (owner.getCase(this.name) !== this)
      throw new Error('Illegal attach attempt.');
    this.owner = owner;
    this.value = value;
  }

  isAttached(): boolean {
    return !!this.owner;
  }

  getValue(): number {
    if (!this.isAttached()) {
      throw new Error('Field is not attached.');
    }
    return this.value;
  }
}
