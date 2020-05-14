import {
  PrimitiveTypeName,
  IRObjectField,
  IREnum,
  Program,
  IRType,
  IREnumCase,
  IRObject,
} from '../ir';
import { Context } from '../template/context';
import { register } from '../template/collections/rust';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fastPow2Log2 } from '../../runtime/utils';

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

function alignmentPow2(object: IRObject): number {
  return fastPow2Log2(object.getMaxElementAlignment());
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

function equalCondition(field: IRObjectField): string {
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

export function generateRustServer(program: Program): string {
  const context = new Context();
  register(context);

  context.pipe('type', typename);
  context.pipe('alignmentPow2', alignmentPow2);
  context.pipe('serialize', serialize);
  context.pipe('deserialize', deserialize);

  context.pipe('encoder', encoder);
  context.pipe('sortForEqual', sortForEqual);
  context.pipe('equal', equalCondition);

  context.bind('objects', [...program.getObjects()]);
  context.bind('enums', [...program.getEnums()]);
  context.bind('rpc', program.getRPC());

  const runtime = readFileSync(
    join(dirname(require.main!.filename), '../resources/runtime.rs'),
    'utf-8'
  );

  const template = readFileSync(
    join(dirname(require.main!.filename), '../resources/rust.template'),
    'utf-8'
  );

  // context.writer.write(runtime);
  context.run(template);

  return context.data();
}

function isRef(type: IRType): boolean {
  return !(
    type.isPrimitive &&
    type.name !== 'str' &&
    type.name !== 'hash16' &&
    type.name !== 'hash20'
  );
}
