import { Program } from '../ir/program';
import { PrettyWriter } from './writer';
import { PrimitiveTypeName } from '../ir/type';
import { IRObject } from '../ir/object';
import { toSnakeCase, getObjectFieldPrivateType, toPascalCase } from '../utils';

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

  program.getRPC();

  for (const object of program.getObjects()) {
    generateObjectStruct(writer, object);
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
