import { PrimitiveTypeName, IRObjectField, Program, IRType } from '../ir';
import { fastPow2Log2 } from '../../runtime/utils';
import template from '../templates/dist/rust';

export const PRIMITIVE_TYPE: Record<PrimitiveTypeName, string> = {
  hash16: 'voss_runtime::HASH16',
  hash20: 'voss_runtime::HASH20',
  i8: 'i8',
  i16: 'i16',
  i32: 'i32',
  u8: 'u8',
  u16: 'u16',
  u32: 'u32',
  f32: 'f32',
  f64: 'f64',
  bool: 'bool',
  str: 'String',
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

function serialize(field: IRObjectField): string {
  let uri = 'self.' + field.snakeCase;
  const offset = field.getOffset();
  const writeFn: string = field.type.isRootObject
    ? 'hash16'
    : field.type.isObject
    ? 'object'
    : field.type.isEnum
    ? 'oneof'
    : field.type.asPrimitiveName();
  if (isRef(field.type)) uri = '&' + uri;
  return `builder.${writeFn}(${offset}, ${uri})?;`;
}

function deserialize(field: IRObjectField): string {
  const uri = field.snakeCase;
  const offset = field.getOffset();
  const writeFn: string = field.type.isRootObject
    ? 'hash16'
    : field.type.isObject
    ? `object::<${field.type.pascalCase}>`
    : field.type.isEnum
    ? 'oneof'
    : field.type.asPrimitiveName();
  return `${uri}: reader.${writeFn}(${offset})?,`;
}

function isRef(type: IRType): boolean {
  return !(
    type.isPrimitive &&
    type.name !== 'str' &&
    type.name !== 'hash16' &&
    type.name !== 'hash20'
  );
}

export function generateRustServer(program: Program): string {
  return template({
    objects: [...program.getObjects()],
    enums: [...program.getEnums()],
    rpc: program.getRPC(),
    vcs: program.getVCS(),
    root: [...program.getObjects()].filter((obj) => obj.isRoot),
    // Helper functions:
    typename,
    deserialize,
    serialize,
    fastPow2Log2,
  });
}
