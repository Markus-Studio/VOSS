import { IRType } from './type';
import memorize from 'memorize-decorator';
import { toPascalCase, toCamelCase, toSnakeCase } from '../utils';

/**
 * An enum is the equivalent of the tagged union in other languages.
 * Every enum consists of some cases each mapped to a unique numeric
 * (u32) value which is called the case tag and determines the current
 * active member, enums members are of type Object.
 *
 * @see IRObject
 */
export class IREnum {
  /**
   * Map name of every IREnumCase to itself, for fast name-lookup.
   */
  private readonly cases = new Map<string, IREnumCase>();

  /**
   * A set that tracks used `tag` values, two case in an enum cannot
   * share the same tag.
   */
  private readonly usedValues = new Set<number>();

  /**
   *
   * @param id The ID of the enum in the program.
   * @param name Name of the enum.
   */
  constructor(readonly id: number, readonly name: string) {}

  /**
   * Attaches the given EnumCase to this enum, throws error if:
   *  - The case is already attached to another enum.
   *  - The case's `tag` is used by another member.
   *  - Name of the case is already in use by another case.
   *
   * @param enumCase The enum case.
   */
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

  /**
   * Returns the case in this enum by its name.
   *
   * @param name Name of the case we're looking for.
   */
  getCase(name: string): IREnumCase | undefined {
    return this.cases.get(name);
  }

  /**
   * Returns an iterator over all of the cases that are attached to
   * this enum.
   */
  getCases(): Iterable<IREnumCase> {
    return this.cases.values();
  }

  /**
   * Returns name of this enum in PascalCase.
   */
  @memorize()
  get pascalCase() {
    return toPascalCase(this.name);
  }

  /**
   * Returns name of this enum in camelCase.
   */
  @memorize()
  get camelCase() {
    return toCamelCase(this.name);
  }

  /**
   * Returns name of this enum in snake_case.
   */
  @memorize()
  get snakeCase() {
    return toSnakeCase(this.name);
  }
}

/**
 * Represents a case inside an enum.
 */
export class IREnumCase {
  /**
   * The enum which this case is attached to.
   */
  private owner?: IREnum;

  constructor(
    /**
     * Name of the case.
     */
    readonly name: string,
    /**
     * The type of this case, must be Object.
     */
    readonly type: IRType,
    /**
     * The tag of this case.
     */
    readonly value: number
  ) {
    if (!this.type.isStructure) {
      throw new Error('EnumCase can only be of non-root structure type.');
    }
  }

  /**
   * Attaches the case to an enum, this function is used internally in
   * `IREnum.addCase` and one must use that method to add a new case
   * to an enum.
   *
   * @param owner Returns
   * @internal
   */
  attach(owner: IREnum): void {
    if (this.owner)
      throw new Error(`Enum case ${this.name} is already attached.`);
    if (owner.getCase(this.name) !== this)
      throw new Error('Illegal attach attempt.');
    this.owner = owner;
  }

  /**
   * Return true if this case is attached to an enum.
   */
  isAttached(): boolean {
    return !!this.owner;
  }

  /**
   * Name of the case in PascalCase.
   */
  @memorize()
  get pascalCase() {
    return toPascalCase(this.name);
  }

  /**
   * Name of the case in camelCase.
   */
  @memorize()
  get camelCase() {
    return toCamelCase(this.name);
  }

  /**
   * Name of the case in snake_case.
   */
  @memorize()
  get snakeCase() {
    return toSnakeCase(this.name);
  }
}
