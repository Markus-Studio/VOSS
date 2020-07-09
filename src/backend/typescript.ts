import { PrimitiveTypeName, IRObjectField, Program, IRType } from '../ir';
import template from '../templates/dist/typescript';

const PRIMITIVE_TYPE: Record<PrimitiveTypeName, string> = {
  hash16: 'HASH16',
  hash20: 'HASH20',
  i8: 'number',
  i16: 'number',
  i32: 'number',
  u8: 'number',
  u16: 'number',
  u32: 'number',
  f32: 'number',
  f64: 'number',
  bool: 'boolean',
  str: 'string',
};

function typename(type: IRType): string {
  if (type.isPrimitive) {
    return PRIMITIVE_TYPE[type.asPrimitiveName()];
  }

  if (type.isRootObject) {
    return PRIMITIVE_TYPE.hash16;
  }

  return type.pascalCase;
}

function encoder(type: IRType): string {
  return type.isRootObject
    ? 'hash16'
    : type.isObject
    ? 'struct'
    : type.isEnum
    ? 'enum'
    : type.asPrimitiveName();
}

function sortForEqual(fields: Iterable<IRObjectField>): IRObjectField[] {
  return [...fields].sort((a, b) => {
    if (a.type.isPrimitive) return -1;
    if (b.type.isPrimitive) return 1;
    return 0;
  });
}

function equalTemplate(field: IRObjectField): string {
  const name = field.camelCase;
  if (field.type.isPrimitive || field.type.isRootObject) {
    return `this.data.${name} === other.data.${name}`;
  }

  if (field.type.isObject) {
    return `this.data.${name}.equal(other.data.${name})`;
  }

  if (field.type.isEnum) {
    return `voss.enumEqual(this.data.${name}, other.data.${name})`;
  }

  throw new Error('Not implemented.');
}

function fieldSetterValue(field: IRObjectField): string {
  if (field.type.isRootObject) {
    return 'value.getUuid()';
  }
  return 'value';
}

function fieldSetterType(field: IRObjectField): string {
  if (field.type.isRootObject) {
    return field.type.pascalCase;
  }
  return typename(field.type);
}

export function generateTypescriptClient(program: Program): string {
  return template({
    objects: [...program.getObjects()],
    enums: [...program.getEnums()],
    rpc: program.getRPC(),
    // Helper functions:
    typename,
    fieldSetterType,
    fieldSetterValue,
    sortForEqual,
    equalTemplate,
    encoder,
  });
}
