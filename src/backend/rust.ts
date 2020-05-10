import {
  PrimitiveTypeName,
  IRType,
  IRObject,
  IRObjectField,
  IREnum,
  Program,
} from '../ir';
import { PrettyWriter } from './writer';
import { getObjectFieldPrivateType } from '../utils';
import { fastPow2Log2, enumEqual } from '../../runtime/utils';
import { runtime } from './rust.runtime';
import { generateRPC } from './rust.rpc';

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

export function generateRustServer(program: Program): string {
  const writer = new PrettyWriter();

  writer.write('#![allow(dead_code)]\n');
  writer.write(runtime + '\n');

  for (const object of program.getObjects()) {
    generateObjectStruct(writer, object);
  }

  for (const oneof of program.getEnums()) {
    generateEnum(writer, oneof);
  }

  generateRPC(writer, program);

  return writer.getSource();
}

export function generateObjectStruct(
  writer: PrettyWriter,
  object: IRObject,
  inRPC = false
): void {
  writer.write(`#[derive(Clone, Debug, PartialEq)]
  pub struct ${object.pascalCase} {\n`);
  for (const field of object.getFields()) {
    writer.write(field.snakeCase + ': ');
    writer.write(getObjectFieldPrivateType(PRIMITIVE_TYPE, field.type) + ',\n');
  }
  writer.write(`}\n`);

  generateObjectImplVossStruct(writer, object);
  generateObjectImplFromReader(writer, object);
  generateObjectImpl(writer, object, inRPC);
}

function generateObjectImplVossStruct(
  writer: PrettyWriter,
  object: IRObject
): void {
  const name = object.pascalCase;
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
  const name = object.pascalCase;
  writer.write(`impl voss_runtime::FromReader for ${name} {
      fn from_reader(reader: &voss_runtime::VossReader) -> Result<Self, voss_runtime::ReaderError> {
        Ok(${name} {
        ${[...object.getFields()]
          .map((field) => {
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
          })
          .join('\n')}
        })
      }
  }\n`);
}

function generateObjectImpl(
  writer: PrettyWriter,
  object: IRObject,
  inRPC: boolean
) {
  const name = object.pascalCase;
  writer.write(`impl ${name} {
    pub fn new(
      ${[...object.getFields()]
        .map((field) => {
          let type = field.type.isPrimitive
            ? PRIMITIVE_TYPE[field.type.asPrimitiveName()]
            : field.type.isRootObject
            ? `&${inRPC ? 'super::' : ''}${field.type.pascalCase}`
            : field.type.pascalCase;
          return `${field.snakeCase}: ${type},`;
        })
        .join('\n')}
    ) -> ${name} {
      ${name} {
        ${[...object.getFields()]
          .map((field) => {
            let name = field.snakeCase;
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
  const name = field.snakeCase.startsWith('_')
    ? '_get' + field.snakeCase
    : 'get_' + field.snakeCase;
  const type = getObjectFieldPrivateType(PRIMITIVE_TYPE, field.type);
  const ref = isRef(field.type) ? '&' : '';
  writer.write(`pub fn ${name}(&self) -> ${ref}${type} {
    ${ref}self.${field.snakeCase}
  }\n`);
}

export function generateEnum(writer: PrettyWriter, oneof: IREnum) {
  const derive = ['Clone', 'Debug', 'PartialEq'];
  writer.write(`#[derive(${derive.join(', ')})]
  pub enum ${oneof.pascalCase} {
    ${[...oneof.getCases()]
      .map((enumCase) => {
        return `${enumCase.pascalCase}(${enumCase.type.pascalCase}),`;
      })
      .join('\n')}
  }\n`);

  generateEnumImplVossEnum(writer, oneof);
  generateEnumImplFromReader(writer, oneof);
}

function generateEnumImplVossEnum(writer: PrettyWriter, oneof: IREnum) {
  const name = oneof.pascalCase;
  writer.write(`impl<'a> voss_runtime::VossEnum<'a> for ${name} {
    fn get_type(&self) -> u32 {
      match &self {
        ${[...oneof.getCases()]
          .map((enumCase) => {
            const caseTag = enumCase.value;
            return `${name}::${enumCase.pascalCase}(_) => ${caseTag},`;
          })
          .join('\n')}
      }
    }

    fn get_value(&'a self) -> &'a dyn voss_runtime::VossStruct {
      match &self {
        ${[...oneof.getCases()]
          .map((enumCase) => {
            return `${name}::${enumCase.pascalCase}(v) => v,`;
          })
          .join('\n')}
      }
    }
  }\n`);
}

function generateEnumImplFromReader(writer: PrettyWriter, oneof: IREnum) {
  const name = oneof.pascalCase;
  writer.write(`impl voss_runtime::FromReader for ${name} {
    fn from_reader(reader: &voss_runtime::VossReader) -> Result<Self, voss_runtime::ReaderError> {
      match reader.u32(0)? {
        ${[...oneof.getCases()]
          .map((enumCase) => {
            const caseName = enumCase.pascalCase;
            const caseTag = enumCase.value;
            const typeName = enumCase.type.pascalCase;
            return `${caseTag} => Ok(${name}::${caseName}(reader.object::<${typeName}>(4)?)),`;
          })
          .join('\n')}
        _ => Err(voss_runtime::ReaderError::InvalidBuffer)
      }
    }
  }`);
}

function isRef(type: IRType): boolean {
  return !(
    type.isPrimitive &&
    type.name !== 'str' &&
    type.name !== 'hash16' &&
    type.name !== 'hash20'
  );
}
