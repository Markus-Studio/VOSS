import { IRObject } from './object';
import { IRType } from './type';
import { IREnum } from './enum';
import { buildRPC } from './rpc';

export class Program {
  private readonly usedNames = new Set<string>();
  private readonly objects = new Map<string, IRObject>();
  private readonly enums = new Map<string, IREnum>();
  private _rpc?: IREnum;

  resolveType(name: string): IRType {
    if (IRType.isPrimitive(name)) {
      return IRType.Primitive(name);
    }

    if (this.objects.has(name)) {
      const object = this.objects.get(name)!;
      return IRType.Object(object);
    }

    if (this.enums.has(name)) {
      const irEnum = this.enums.get(name)!;
      return IRType.Enum(irEnum);
    }

    throw new Error(`Cannot resolve name ${name}.`);
  }

  addObject(object: IRObject) {
    if (IRType.isPrimitive(object.name)) {
      throw new Error(`${object.name} cannot be used as an object name.`);
    }

    if (this.usedNames.has(object.name)) {
      throw new Error(`Name '${object.name}' is already in use.`);
    }

    this.objects.set(object.name, object);
    this.usedNames.add(object.name);
  }

  addEnum(irEnum: IREnum) {
    if (IRType.isPrimitive(irEnum.name)) {
      throw new Error(`${irEnum.name} cannot be used as an enum name.`);
    }

    if (this.usedNames.has(irEnum.name)) {
      throw new Error(`Name '${irEnum.name}' is already in use.`);
    }

    this.enums.set(irEnum.name, irEnum);
    this.usedNames.add(irEnum.name);
  }

  resolveObject(name: string): IRObject {
    if (!this.objects.has(name)) {
      throw new Error(`Cannot resolve name '${name}'.`);
    }
    return this.objects.get(name)!;
  }

  resolveEnum(name: string): IREnum {
    if (!this.enums.has(name)) {
      throw new Error(`Cannot resolve name '${name}'.`);
    }
    return this.enums.get(name)!;
  }

  getEnums(): Iterable<IREnum> {
    return this.enums.values();
  }

  getObjects(): Iterable<IRObject> {
    return this.objects.values();
  }

  getRPC() {
    if (this._rpc) {
      return this._rpc;
    }
    return (this._rpc = buildRPC(this));
  }
}
