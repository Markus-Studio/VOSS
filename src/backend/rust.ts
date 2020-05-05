import { Program } from '../ir/program';
import { PrettyWriter } from './writer';
import { PrimitiveTypeName } from '../ir/type';
import { IRObject } from '../ir/object';
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

  writer.write(runtime + '\n');

  program.getRPC();

  for (const object of program.getObjects()) {
    generateObjectStruct(writer, object);
    generateObjectImplVossStruct(writer, object);
    generateObjectImplFromReader(writer, object);
  }

  return writer.getSource();
}

function generateObjectStruct(writer: PrettyWriter, object: IRObject): void {
  writer.write(`pub struct ${toPascalCase(object.name)} {\n`);
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
            const uri = 'self.' + toSnakeCase(field.name);
            const offset = field.getOffset();
            const writeFn: string = field.type.isRootObject
              ? 'uuid'
              : field.type.isObject
              ? 'object'
              : field.type.isEnum
              ? 'oneof'
              : field.type.asPrimitiveName();
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
            const uri = 'self.' + toSnakeCase(field.name);
            const offset = field.getOffset();
            const writeFn: string = field.type.isRootObject
              ? 'uuid'
              : field.type.isObject
              ? 'object'
              : field.type.isEnum
              ? 'oneof'
              : field.type.asPrimitiveName();
            const fn = toSnakeCase(field.name);
            return `${fn}: builder.${writeFn}(${offset}, ${uri})?,`;
          })
          .join('\n')}
        })
      }
  }\n`);
}
