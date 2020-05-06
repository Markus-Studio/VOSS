import { Program } from '../ir/program';
import { PrettyWriter } from './writer';
import { PrimitiveTypeName, IRType } from '../ir/type';
import { IRObject, IRObjectField } from '../ir/object';
import { toSnakeCase, getObjectFieldPrivateType, toPascalCase } from '../utils';
import { fastPow2Log2 } from '../../runtime/utils';
import { runtime } from './rust.runtime';

const PRIMITIVE_TYPE: Record<PrimitiveTypeName, string> = {
  uuid: 'voss_runtime::UUID',
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

export function generateRustServer(program: Program): string {
  const writer = new PrettyWriter();

  writer.write('#![allow(dead_code)]\n');
  writer.write(runtime + '\n');

  program.getRPC();

  for (const object of program.getObjects()) {
    generateObjectStruct(writer, object);
    generateObjectImplVossStruct(writer, object);
    generateObjectImplFromReader(writer, object);
    generateObjectImpl(writer, object);
  }

  return writer.getSource();
}

function generateObjectStruct(writer: PrettyWriter, object: IRObject): void {
  writer.write(`#[derive(Clone, Debug)]
  pub struct ${toPascalCase(object.name)} {\n`);
  for (const field of object.getFields()) {
    writer.write(toSnakeCase(field.name) + ': ');
    writer.write(getObjectFieldPrivateType(PRIMITIVE_TYPE, field.type) + ',\n');
  }
  writer.write(`}\n`);
}

function generateObjectImplVossStruct(
  writer: PrettyWriter,
  object: IRObject
): void {
  const name = toPascalCase(object.name);
  writer.write(`impl voss_runtime::VossStruct for ${name} {
    fn alignment_pow2(&self) -> usize {
        ${fastPow2Log2(object.getMaxElementAlignment())}
    }

    fn size(&self) -> usize {
        ${object.getSize()}
    }

    fn serialize(
        &self,
        builder: &mut voss_runtime::VossBuilder,
    ) -> Result<(), voss_runtime::BuilderError> {
        ${[...object.getFields()]
          .map((field) => {
            let uri = 'self.' + toSnakeCase(field.name);
            const offset = field.getOffset();
            const writeFn: string = field.type.isRootObject
              ? 'uuid'
              : field.type.isObject
              ? 'object'
              : field.type.isEnum
              ? 'oneof'
              : field.type.asPrimitiveName();
            if (isRef(field.type)) uri = '&' + uri;
            return `builder.${writeFn}(${offset}, ${uri})?;`;
          })
          .join('\n')}
        Ok(())
    }
  }\n`);
}

function generateObjectImplFromReader(
  writer: PrettyWriter,
  object: IRObject
): void {
  const name = toPascalCase(object.name);
  writer.write(`impl voss_runtime::FromReader for ${name} {
      fn from_reader(reader: &voss_runtime::VossReader) -> Result<Self, voss_runtime::ReaderError> {
        Ok(${name} {
        ${[...object.getFields()]
          .map((field) => {
            const uri = toSnakeCase(field.name);
            const offset = field.getOffset();
            const writeFn: string = field.type.isRootObject
              ? 'uuid'
              : field.type.isObject
              ? `object::<${toPascalCase(field.type.name)}>`
              : field.type.isEnum
              ? 'oneof'
              : field.type.asPrimitiveName();
            return `${uri}: reader.${writeFn}(${offset})?,`;
          })
          .join('\n')}
        })
      }
  }\n`);
}

function generateObjectImpl(writer: PrettyWriter, object: IRObject) {
  const name = toPascalCase(object.name);
  writer.write(`impl ${name} {
    pub fn new(
      ${[...object.getFields()]
        .map((field) => {
          let type = field.type.isPrimitive
            ? PRIMITIVE_TYPE[field.type.asPrimitiveName()]
            : field.type.isRootObject
            ? `&${toPascalCase(field.type.name)}`
            : toPascalCase(field.type.name);
          return `${toSnakeCase(field.name)}: ${type},`;
        })
        .join('\n')}
    ) -> ${name} {
      ${name} {
        ${[...object.getFields()]
          .map((field) => {
            let name = toSnakeCase(field.name);
            let uri = field.type.isRootObject ? `*${name}.get_uuid()` : '';
            return uri ? `${name}: ${uri},` : `${name},`;
          })
          .join('\n')}
      }
    }\n`);

  for (const field of object.getFields()) {
    generateObjectPropertyGetter(writer, field);
    if (field.name !== 'uuid') {
      // generateObjectPropertySetter(writer, field);
    }
  }

  writer.write(`}\n`);
}

function generateObjectPropertyGetter(
  writer: PrettyWriter,
  field: IRObjectField
) {
  const name = toSnakeCase('get-' + field.name);
  const type = getObjectFieldPrivateType(PRIMITIVE_TYPE, field.type);
  const ref = isRef(field.type) ? '&' : '';
  writer.write(`pub fn ${name}(&self) -> ${ref}${type} {
    ${ref}self.${toSnakeCase(field.name)}
  }\n`);
}

function isRef(type: IRType): boolean {
  return !(type.isPrimitive && type.name !== 'str' && type.name !== 'uuid');
}
