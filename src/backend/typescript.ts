import { PrettyWriter } from './writer';
import { Program } from '../ir/program';
import { IRObject, IRObjectField } from '../ir/object';
import { toCamelCase, toPascalCase, getObjectFieldPrivateType } from '../utils';
import { PrimitiveTypeName } from '../ir/type';
import { IREnum } from '../ir/enum';

const PRIMITIVE_TYPE: Record<PrimitiveTypeName, string> = {
  uuid: 'UUID',
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

export function generateTypescriptClient(program: Program): string {
  const writer = new PrettyWriter();

  writer.write('// VOSS AUTOGENERATED FILE, DO NOT MODIFY.\n');
  writer.write(`import {
  Builder,
  ChangeNotifier,
  DeserializeFn,
  EnumCase,
  IChangeNotifier,
  Reader,
  Struct,
  VossSessionBase,
} from './runtime';\n\n`);
  writer.write(`type UUID = string;\n`);

  program.getRPC();

  for (const object of program.getObjects()) {
    generateObjectDataInterface(writer, object);
    generateObjectClass(writer, object);
  }

  for (const irEnum of program.getEnums()) {
    generateEnum(writer, irEnum);
  }

  generateEnum(writer, program.getRPC());

  generateSessionClass(writer, program);

  return writer.getSource();
}

function generateObjectDataInterface(
  writer: PrettyWriter,
  object: IRObject
): void {
  const name = toPascalCase(object.name) + '$Data';
  writer.write(`export interface ${name} {\n`);
  for (const field of object.getFields()) {
    writer.write(toCamelCase(field.name) + ': ');
    writer.write(getObjectFieldPrivateType(PRIMITIVE_TYPE, field.type) + ',\n');
  }
  writer.write(`}\n`);
}

function generateObjectClass(writer: PrettyWriter, object: IRObject): void {
  const maxAlign = object.getMaxElementAlignment();
  const interfaces = ['Struct'];
  if (object.isRoot) interfaces.push('ChangeNotifier');

  // Build the proper class deceleration.
  writer.write(`export class ${toPascalCase(object.name)} `);
  if (object.isRoot) writer.write('extends IChangeNotifier ');
  writer.write(`implements ${interfaces.join(', ')} {\n`);

  if (object.isRoot) {
    for (const view of object.getViews()) {
    }
  }

  // The data for the serialization.
  writer.write(`readonly maxElementAlignment = ${maxAlign};\n`);
  writer.write(`readonly size = ${object.getSize()};\n`);

  // ... Build the constructor.
  generateObjectClassConstructor(writer, object);

  for (const field of object.getFields()) {
    generateObjectPropertyGetter(writer, field);
    if (field.name !== 'uuid') {
      generateObjectPropertySetter(writer, field);
    }
  }

  // The patch() function is used internally to update an object and
  // notify its listeners.
  if (object.isRoot) {
    generateObjectPatch(writer, object);
  }

  // The serialization methods.
  generateSerializeMethod(writer, object);
  generateDeserializeMethod(writer, object);

  writer.write('}\n');
}

function generateObjectClassConstructor(
  writer: PrettyWriter,
  object: IRObject
): void {
  const dataInterfaceName = toPascalCase(object.name) + '$Data';
  writer.write(`constructor(private data: ${dataInterfaceName}) {\n`);
  if (object.isRoot) {
    writer.write('super();\n');
  }
  writer.write(`}\n`);
}

function generateObjectPropertyGetter(
  writer: PrettyWriter,
  field: IRObjectField
): void {
  const name = 'this.data.' + toCamelCase(field.name);
  const fieldName = toPascalCase(field.name);
  if (field.type.isRootObject) {
    const returnName = toPascalCase(field.type.asObject().name);
    writer.write('fetch' + fieldName + '(session: VossSession):');
    writer.write(` Promise<${returnName} | undefined> {\n`);
    writer.write(`return session.fetchObjectByUUID(${name});\n`);
    writer.write('}\n');
  } else {
    writer.write('get' + toPascalCase(field.name) + '() {\n');
    writer.write(`return ${name};\n`);
    writer.write('}\n');
  }
}

function generateObjectPropertySetter(
  writer: PrettyWriter,
  field: IRObjectField
): void {
  const object = field.getOwner();
  const valueType = field.type.isPrimitive
    ? PRIMITIVE_TYPE[field.type.asPrimitiveName()]
    : toPascalCase(field.type.name);
  const valueGetter = field.type.isRootObject ? `.getUuid()` : '';

  if (object.isRoot) {
    const fieldName = toPascalCase(field.name);
    const objectName = toPascalCase(object.name);
    const caseName = 'Object' + objectName + 'Set' + fieldName;
    const req = '_' + caseName + 'Request';
    writer.write(`
set${fieldName}(session: VossSession, value: ${valueType}): Promise<void> {
  this.data.${toCamelCase(field.name)} = value${valueGetter};
  this.emitChange();
  return session.sendRequest((replyId, timestamp) => ({
      type: _RPCMessage$Type.${caseName},
      value: new ${req}({
        replyId,
        timestamp,
        previousValue: this.data.${toCamelCase(field.name)},
        newValue: value${valueGetter},
      })
  }));
}\n`);
    return;
  }

  writer.write(
    `set${toPascalCase(field.name)}(value: ${valueType}): ${object.name} {\n`
  );
  writer.write(
    `return new ${object.name}({...this.data, ${toCamelCase(
      field.name
    )}: value${valueGetter}});\n`
  );
  writer.write('}\n');
}

function generateObjectPatch(writer: PrettyWriter, object: IRObject): void {
  const dataInterfaceName = toPascalCase(object.name) + '$Data';
  writer.write(
    `updateInternal(patch: Partial<${dataInterfaceName}>): void {\n`
  );
  writer.write('this.data = {...this.data, ...patch};\n');
  writer.write('this.emitChange();\n');
  writer.write('}\n');
}

function generateSerializeMethod(writer: PrettyWriter, object: IRObject): void {
  writer.write('serialize(builder: Builder) {\n');
  for (const field of object.getFields()) {
    const name = 'this.data.' + toCamelCase(field.name);
    const offset = field.getOffset();
    const writeFn: string = field.type.isRootObject
      ? 'uuid'
      : field.type.isObject
      ? 'struct'
      : field.type.isEnum
      ? 'enum'
      : field.type.asPrimitiveName();
    writer.write(`builder.${writeFn}(${offset}, ${name});\n`);
  }
  writer.write('}\n');
}

function generateDeserializeMethod(
  writer: PrettyWriter,
  object: IRObject
): void {
  writer.write('static deserialize(reader: Reader) {\n');
  writer.write(`return new ${object.name}({\n`);
  writer.indent();
  for (const field of object.getFields()) {
    writer.write(
      toCamelCase(field.name) + ': ' + getDeserializeField(field) + ',\n'
    );
  }
  writer.dedent();
  writer.write('});\n}\n');
}

function getDeserializeField(field: IRObjectField): string {
  const offset = field.getOffset();
  const readFn: string = field.type.isRootObject
    ? 'uuid'
    : field.type.isObject
    ? 'struct'
    : field.type.isEnum
    ? 'enum'
    : field.type.asPrimitiveName();
  const deserializeFn = field.type.isStructure
    ? ', ' + field.type.asObject().name + '.deserialize'
    : field.type.isEnum
    ? ', ' + field.type.asEnum().name + '$DeserializerMap'
    : '';
  return `reader.${readFn}(${offset}${deserializeFn})`;
}

function generateEnum(writer: PrettyWriter, irEnum: IREnum): void {
  generateEnumTypeEnum(writer, irEnum);
  generateEnumCases(writer, irEnum);
  generateEnumDeserializer(writer, irEnum);
}

function generateEnumTypeEnum(writer: PrettyWriter, irEnum: IREnum): void {
  writer.write(`export const enum ${irEnum.name}$Type {\n`);
  for (const enumCase of irEnum.getCases()) {
    writer.write(`${enumCase.name} = ${enumCase.value},\n`);
  }
  writer.write('}\n');
}

function generateEnumCases(writer: PrettyWriter, irEnum: IREnum): void {
  const typeEnumName = irEnum.name + '$Type';
  writer.write(`export type ${irEnum.name} =\n`);
  writer.indent();
  for (const enumCase of irEnum.getCases()) {
    writer.write(
      `| EnumCase<${typeEnumName}.${enumCase.name}, ${enumCase.type.name}>\n`
    );
  }
  writer.write(';\n');
  writer.dedent();
}

function generateEnumDeserializer(writer: PrettyWriter, irEnum: IREnum): void {
  const constName = irEnum.name + '$DeserializerMap';
  const typeEnumName = irEnum.name + '$Type';
  writer.write(
    `export const ${constName}: Record<${typeEnumName}, DeserializeFn<any>> = {\n`
  );
  for (const enumCase of irEnum.getCases()) {
    writer.write(
      `[${typeEnumName}.${enumCase.name}]: ${enumCase.type.name}.deserialize,\n`
    );
  }
  writer.write('}\n');
}

function generateSessionClass(writer: PrettyWriter, program: Program): void {
  writer.write(`export class VossSession extends VossSessionBase<_RPCMessage> {
  protected objects = new Map<string, Struct>();
  protected deserializeMap = _RPCMessage$DeserializerMap;

  async fetchObjectByUUID(uuid: string): Promise<any> {
    if (this.objects.has(uuid)) {
      return this.objects.get(uuid);
    }

    await this.sendRequest((replyId) => ({
        type: _RPCMessage$Type.FetchByUUID,
        value: new _FetchByUUIDRequest({ replyId, uuid }),
    }));

    return this.objects.get(uuid);
  }

  protected createClockRequest(timestamp: number): _RPCMessage {
    return {
      type: _RPCMessage$Type.Clock,
      value: new _ClockData({ timestamp }),
    };
  }

  protected onMessage(message: _RPCMessage): void {
    if (message.type === _RPCMessage$Type.Reply) {
      this.receivedReply(message.value.getReplyId());
      return;
    }

    if (message.type === _RPCMessage$Type.Clock) {
      this.receivedTime(message.value.getTimestamp());
      return;
    }
  }
}
`);
}
