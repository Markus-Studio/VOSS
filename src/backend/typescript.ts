import {
  PrimitiveTypeName,
  IRObjectField,
  IREnum,
  Program,
  IRType,
  IREnumCase,
} from '../ir';
import { Context } from '../template/context';
import { register } from '../template/collections/typescript';
import { load } from '../resources';

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

function objectBase(name: string) {
  return `voss.ObjectBase<${name}$Data, RPC.VossSession>`;
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

function enumMember(member: IREnumCase): string {
  const typeEnumName = member.getOwner().pascalCase + '$Type';
  return `| voss.EnumCase<${typeEnumName}.${member.pascalCase}, ${member.type.pascalCase}>`;
}

function enumDeserializer(member: IREnumCase): string {
  const typeEnumName = member.getOwner().pascalCase + '$Type';
  return `[${typeEnumName}.${member.pascalCase}]: ${member.type.pascalCase}.deserialize,`;
}

function enumDeserializerType(irEnum: IREnum): string {
  return `Record<${irEnum.pascalCase}$Type, voss.DeserializeFn<any>>`;
}

function fieldViewMap(field: IRObjectField): string {
  const target = field.getOwner().pascalCase;
  return `new WeakMap<RPC.VossSession, Map<HASH16, voss.View<${target}>>>()`;
}

export function _generateTypescriptClient(program: Program): string {
  const context = new Context();
  register(context);

  context.pipe('type', typename);
  context.pipe('objectBase', objectBase);
  context.pipe('encoder', encoder);
  context.pipe('sortForEqual', sortForEqual);
  context.pipe('equal', equalTemplate);
  context.pipe('fieldSetterValue', fieldSetterValue);
  context.pipe('fieldSetterType', fieldSetterType);
  context.pipe('enumMember', enumMember);
  context.pipe('enumDeserializer', enumDeserializer);
  context.pipe('enumDeserializerType', enumDeserializerType);
  context.pipe('fieldViewMap', fieldViewMap);

  context.bind('objects', [...program.getObjects()]);
  context.bind('enums', [...program.getEnums()]);
  context.bind('rpc', program.getRPC());

  const template = load('typescript.template');
  context.run(template);

  return context.data();
}

import template from '../../templates/dist/typescript';
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
    encoder
  });
}
