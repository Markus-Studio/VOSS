import {
  PrimitiveTypeName,
  IRObject,
  IRObjectField,
  IREnum,
  Program,
  IRType,
} from '../ir';
import { PrettyWriter } from './writer';
import { flatten } from '../utils';
import { Context } from '../template/context';
import { register } from '../template/collections/typescript';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import * as pluralize from 'pluralize';

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
  return `voss.ObjectBase<${name}>`;
}

export function generateTypescriptClient(program: Program): string {
  const context = new Context();
  register(context);

  context.pipe('type', typename);
  context.pipe('objectBase', objectBase);

  context.bind('objects', [...program.getObjects()]);

  const template = readFileSync(
    join(dirname(require.main!.filename), '../resources/typescript.template'),
    'utf-8'
  );
  context.run(template);

  return context.data();
}

function generateObject(writer: PrettyWriter, object: IRObject): void {
  const maxAlign = object.getMaxElementAlignment();

  // Build the proper class deceleration.
  writer.write(`export class ${object.pascalCase} `);
  if (object.isRoot)
    writer.write(`extends voss.ObjectBase<${object.pascalCase}$Data> `);
  writer.write(`implements voss.Struct {\n`);

  // The data for the serialization.
  writer.write(`static readonly maxElementAlignment = ${maxAlign};\n`);
  writer.write(`static readonly size = ${object.getSize()};\n`);

  if (object.isRoot) {
    generateObjectViews(writer, object);
  }

  // ... Build the constructor.
  generateObjectClassConstructor(writer, object);

  for (const field of object.getFields()) {
    generateObjectPropertyGetter(writer, field);
    if (field.name !== 'uuid') {
      generateObjectPropertySetter(writer, field);
    }
  }

  // The compare function.
  generateEqualMethod(writer, object);

  // The serialization methods.
  generateSerializeMethod(writer, object);
  generateDeserializeMethod(writer, object);

  writer.write('}\n');
}

function generateObjectViews(writer: PrettyWriter, object: IRObject): void {}

function generateObjectClassConstructor(
  writer: PrettyWriter,
  object: IRObject
): void {
  const dataInterfaceName = object.pascalCase + '$Data';
  writer.write(`constructor(protected data: ${dataInterfaceName}) {\n`);
  if (object.isRoot) {
    writer.write('super();\n');
  }
  writer.write(`}\n`);
}

function generateObjectPropertyGetter(
  writer: PrettyWriter,
  field: IRObjectField
): void {
  const name = 'this.data.' + field.camelCase;
  const fieldName = field.pascalCase;
  if (field.type.isRootObject) {
    const returnName = field.type.asObject().pascalCase;
    writer.write('fetch' + fieldName + '(session: RPC.VossSession):');
    writer.write(` Promise<${returnName} | undefined> {\n`);
    writer.write(`return session.fetchObjectByUUID(${name});\n`);
    writer.write('}\n');
  } else {
    writer.write('get' + field.pascalCase + '() {\n');
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
    : field.type.pascalCase;
  const valueGetter = field.type.isRootObject ? `.getUuid()` : '';

  if (object.isRoot) {
    writer.write(`
set${
      field.pascalCase
    }(session: RPC.VossSession, value: ${valueType}): Promise<void> {
  this.data.${field.camelCase} = value${valueGetter};
  this.emitChange();
  return session.sendRequest((replyId, timestamp) => ({
      type: RPC.RPCMessage$Type.${field.rpcGetSetCase()},
      value: new RPC.${field.rpcGetSetMsg()}({
        replyId,
        timestamp,
        target: this.data.uuid,
        current: this.data.${field.camelCase},
        next: value${valueGetter},
      })
  }));
}\n`);
    return;
  }

  writer.write(
    `set${field.pascalCase}(value: ${valueType}): ${object.name} {\n`
  );
  writer.write(
    `return new ${object.pascalCase}({...this.data, ${field.camelCase}: value${valueGetter}});\n`
  );
  writer.write('}\n');
}

function generateEqualMethod(writer: PrettyWriter, object: IRObject): void {
  const fields = [...object.getFields()];
  writer.write(`equal(other: ${object.pascalCase}): boolean {
    if (this.data === other.data) return true;
    return ${
      fields.length === 0
        ? 'true'
        : fields
            .sort((a, b) => {
              if (a.type.isPrimitive) return -1;
              if (b.type.isPrimitive) return 1;
              return 0;
            })
            .map((field) => {
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
            })
            .join(' &&\n')
    };
  }\n`);
}

function generateSerializeMethod(writer: PrettyWriter, object: IRObject): void {
  writer.write('serialize(builder: voss.Builder) {\n');
  for (const field of object.getFields()) {
    const name = 'this.data.' + field.camelCase;
    const offset = field.getOffset();
    const writeFn: string = field.type.isRootObject
      ? 'hash16'
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
  writer.write('static deserialize(reader: voss.Reader) {\n');
  writer.write(`return new ${object.name}({\n`);
  writer.indent();
  for (const field of object.getFields()) {
    writer.write(field.camelCase + ': ' + getDeserializeField(field) + ',\n');
  }
  writer.dedent();
  writer.write('});\n}\n');
}

function getDeserializeField(field: IRObjectField): string {
  const offset = field.getOffset();
  const readFn: string = field.type.isRootObject
    ? 'hash16'
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
  writer.write(`export const enum ${irEnum.pascalCase}$Type {\n`);
  for (const enumCase of irEnum.getCases()) {
    writer.write(`${enumCase.pascalCase} = ${enumCase.value},\n`);
  }
  writer.write('}\n');
}

function generateEnumCases(writer: PrettyWriter, irEnum: IREnum): void {
  const typeEnumName = irEnum.pascalCase + '$Type';
  writer.write(`export type ${irEnum.pascalCase} =\n`);
  writer.indent();
  for (const enumCase of irEnum.getCases()) {
    writer.write(
      `| voss.EnumCase<${typeEnumName}.${enumCase.pascalCase}, ${enumCase.type.pascalCase}>\n`
    );
  }
  writer.write(';\n');
  writer.dedent();
}

function generateEnumDeserializer(writer: PrettyWriter, irEnum: IREnum): void {
  const constName = irEnum.pascalCase + '$DeserializerMap';
  const typeEnumName = irEnum.pascalCase + '$Type';
  writer.write(
    `export const ${constName}: Record<${typeEnumName}, voss.DeserializeFn<any>> = {\n`
  );
  for (const enumCase of irEnum.getCases()) {
    writer.write(
      `[${typeEnumName}.${enumCase.pascalCase}]: ${enumCase.type.pascalCase}.deserialize,\n`
    );
  }
  writer.write('}\n');
}

function generateSessionClass(writer: PrettyWriter, program: Program): void {
  writer.write(`export class VossSession extends voss.VossSessionBase<RPCMessage> {
  protected hostID?: number;
  protected objects = new Map<string, voss.ObjectBase<any>>();
  protected deserializeMap = RPCMessage$DeserializerMap;
  ${[...program.getObjects()]
    .filter((obj) => obj.isRoot)
    .map((obj) => {
      const name = 'viewAll' + pluralize(obj.pascalCase);
      return `readonly ${name}: any;`;
    })
    .join('\n')}

  async fetchObjectByUUID(uuid: string): Promise<any> {
    if (this.objects.has(uuid)) {
      return this.objects.get(uuid);
    }

    await this.sendRequest((replyId) => ({
        type: RPCMessage$Type.FetchByUUID,
        value: new FetchByUUIDMessage({ replyId, uuid }),
    }));

    return this.objects.get(uuid);
  }

  protected createClockRequest(timestamp: number): RPCMessage {
    return {
      type: RPCMessage$Type.Clock,
      value: new ClockMessage({ timestamp }),
    };
  }

  protected getHostId(): number {
    if (this.hostID === undefined) throw new Error('Host ID is not yet initialized.');
    return this.hostID;
  }

  protected CAS(uuid: string, field: string, current: any, next: any): void {
    const object = this.objects.get(uuid);
    if (!object) return;
    if (object.CAS(field, current, next)) return;
    // Conflict.
    throw new Error('Cannot handle conflict.');
  }

  protected onMessage(message: RPCMessage): void {
    switch (message.type) {
      case RPCMessage$Type.Reply:
        this.receivedReply(message.value.getReplyId());
        break;
      case RPCMessage$Type.Clock:
        this.receivedTime(message.value.getTimestamp());
        break;
      case RPCMessage$Type.HostID:
        this.hostID = message.value.getValue();
        break;
      ${flatten(
        [...program.getObjects()]
          .filter((object) => object.isRoot)
          .map((object) => {
            const objectName = object.pascalCase;
            return [...object.getFields()]
              .filter((field) => field.name !== 'uuid')
              .map((field) => {
                return `case RPCMessage$Type.${field.rpcGetSetCase()}:
              this.CAS(
                message.value.getTarget(),
                '${field.camelCase}',
                message.value.getCurrent(),
                message.value.getNext()
              );
              break;`;
              });
          })
      ).join('\n')}
    }
  }
}
`);
}

function generateRPC(writer: PrettyWriter, program: Program): void {
  writer.write('export namespace RPC {\n');

  const rpc = program.getRPC();

  for (const message of rpc.getCases()) {
    const object = message.type.asObject();
    generateObject(writer, object);
  }

  generateEnum(writer, rpc);
  generateSessionClass(writer, program);

  writer.write('}\n');
}
