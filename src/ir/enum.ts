import { IRType } from './type';

export class IREnum {
  private readonly cases = new Map<string, IREnumCase>();
  private readonly usedValues = new Set<number>();

  constructor(readonly id: number, readonly name: string) {}

  addCase(enumCase: IREnumCase) {
    const name = enumCase.name;
    if (this.cases.has(name))
      throw new Error(`Name ${name} is already in use.`);
    if (this.usedValues.has(enumCase.value))
      throw new Error(
        `Value ${enumCase.value} is used by another enum member.`
      );

    this.usedValues.add(enumCase.value);
    this.cases.set(name, enumCase);
    try {
      enumCase.attach(this);
    } catch (e) {
      this.usedValues.delete(enumCase.value);
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

  constructor(
    readonly name: string,
    readonly type: IRType,
    readonly value: number
  ) {
    if (!this.type.isStructure) {
      throw new Error('EnumCase can only be of non-root structure type.');
    }
  }

  attach(owner: IREnum): void {
    if (this.owner)
      throw new Error(`Enum case ${this.name} is already attached.`);
    if (owner.getCase(this.name) !== this)
      throw new Error('Illegal attach attempt.');
    this.owner = owner;
  }

  isAttached(): boolean {
    return !!this.owner;
  }
}
