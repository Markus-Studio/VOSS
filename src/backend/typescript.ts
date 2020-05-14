import {
  PrimitiveTypeName,
  IRObject,
  IRObjectField,
  IREnum,
  Program,
  IRType,
  IREnumCase,
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
  return `voss.ObjectBase<${name}$Data>`;
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

export function generateTypescriptClient(program: Program): string {
  const context = new Context();
  register(context);

  context.pipe('type', typename);
  context.pipe('objectBase', objectBase);
  context.pipe('encoder', encoder);
  context.pipe('sortForEqual', sortForEqual);
  context.pipe('equal', equalCondition);
  context.pipe('fieldSetterValue', fieldSetterValue);
  context.pipe('fieldSetterType', fieldSetterType);
  context.pipe('enumMember', enumMember);
  context.pipe('enumDeserializer', enumDeserializer);
  context.pipe('enumDeserializerType', enumDeserializerType);

  context.bind('objects', [...program.getObjects()]);
  context.bind('enums', [...program.getEnums()]);
  context.bind('rpc', program.getRPC());

  const template = readFileSync(
    join(dirname(require.main!.filename), '../resources/typescript.template'),
    'utf-8'
  );
  context.run(template);

  return context.data();
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
    // const object = message.type.asObject();
    // generateObject(writer, object);
  }

  // generateEnum(writer, rpc);
  generateSessionClass(writer, program);

  writer.write('}\n');
}
