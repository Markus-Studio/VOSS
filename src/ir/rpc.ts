import { IREnum, IREnumCase } from './enum';
import { Program } from './program';
import { IRObject, IRObjectField } from './object';
import { toPascalCase } from '../utils';
import { IRView } from './view';

const enum RPCMessageCategory {
  Clock = 0,
  Reply = 1,
  HostID = 2,
  RootFetch = 3,
  ViewFetch = 4,
  ObjectSet = 5,
  ObjectCreate = 6,
  ObjectDelete = 7,
  FetchByUUID = 8,
}

export enum InternalStructID {
  ClockData = 0,
  ReplyData = 1,
  HostID = 2,
  SetField = 3,
  RootFetch = 4,
  FetchView = 5,
  Delete = 6,
  Create = 7,
  FetchByUUID = 8,
}

export function buildRPC(program: Program): IREnum {
  const rpcMessages = new IREnum(0, 'RPCMessage');
  const objects = [...program.getObjects()];

  rpcMessages.addCase(buildClockMessage(program));
  rpcMessages.addCase(buildReplyMessage(program));
  rpcMessages.addCase(buildHostIdMessage(program));
  rpcMessages.addCase(buildDeleteMessage(program));
  rpcMessages.addCase(buildFetchByUUIDMessage(program));

  for (const object of objects) {
    if (!object.isRoot) continue;

    rpcMessages.addCase(buildCreateMessage(program, object));
    rpcMessages.addCase(buildRootFetchMessage(program, object));

    let counter = 0;
    for (const field of object.getFields()) {
      if (field.isViewed()) {
        rpcMessages.addCase(buildFetchViewMessage(program, field, counter++));
      }

      if (field.name !== 'uuid') {
        rpcMessages.addCase(buildSetFieldMessage(program, field, counter++));
      }
    }
  }

  return rpcMessages;
}

function buildClockMessage(program: Program): IREnumCase {
  const messageID = u32FromBytesVecLE([RPCMessageCategory.Clock, 0, 0, 0]);
  const clockData = new IRObject(
    false,
    InternalStructID.ClockData,
    'ClockMessage'
  );
  clockData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );
  return new IREnumCase('Clock', clockData.getType(), messageID);
}

function buildReplyMessage(program: Program): IREnumCase {
  const messageID = u32FromBytesVecLE([RPCMessageCategory.Reply, 0, 0, 0]);
  const messageData = new IRObject(
    false,
    InternalStructID.ReplyData,
    'ReplyMessage'
  );
  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );
  return new IREnumCase('Reply', messageData.getType(), messageID);
}

function buildHostIdMessage(program: Program): IREnumCase {
  const messageID = u32FromBytesVecLE([RPCMessageCategory.HostID, 0, 0, 0]);
  const messageData = new IRObject(
    false,
    InternalStructID.HostID,
    'HostIDMessage'
  );
  messageData.addField(new IRObjectField('value', program.resolveType('u32')));
  return new IREnumCase('HostID', messageData.getType(), messageID);
}

function buildRootFetchMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.RootFetch, object.id);
  const messageData = new IRObject(
    false,
    InternalStructID.RootFetch,
    object.rpcGetFetchAllMsg()
  );
  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );
  return new IREnumCase(
    object.rpcGetFetchAllMsg(),
    messageData.getType(),
    messageID
  );
}

function buildSetFieldMessage(
  program: Program,
  field: IRObjectField,
  id: number
): IREnumCase {
  const object = field.getOwner();
  const messageID = createUniqueID(RPCMessageCategory.ObjectSet, object.id, id);
  const messageData = new IRObject(
    false,
    InternalStructID.SetField,
    field.rpcGetSetMsg()
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );

  const fieldType = field.type.isRootObject
    ? program.resolveType('hash16')
    : field.type;

  messageData.addField(
    new IRObjectField('target', program.resolveType('hash16'))
  );
  messageData.addField(new IRObjectField('current', fieldType));
  messageData.addField(new IRObjectField('next', fieldType));

  return new IREnumCase(
    field.rpcGetSetCase(),
    messageData.getType(),
    messageID
  );
}

function buildFetchViewMessage(
  program: Program,
  field: IRObjectField,
  id: number
): IREnumCase {
  const object = field.getOwner();
  const messageID = createUniqueID(RPCMessageCategory.ViewFetch, object.id, id);
  const messageData = new IRObject(
    false,
    InternalStructID.FetchView,
    field.rpcGetFetchViewMsg()
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('host', program.resolveType('hash16'))
  );

  return new IREnumCase(
    field.rpcGetFetchViewCase(),
    messageData.getType(),
    messageID
  );
}

function buildDeleteMessage(program: Program): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.ObjectDelete, 0);
  const messageData = new IRObject(
    false,
    InternalStructID.Delete,
    `DeleteMessage`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );

  messageData.addField(
    new IRObjectField('uuid', program.resolveType('hash16'))
  );

  return new IREnumCase('Delete', messageData.getType(), messageID);
}

function buildFetchByUUIDMessage(program: Program): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.FetchByUUID, 0);
  const caseName = 'FetchByUUID';
  const messageData = new IRObject(
    false,
    InternalStructID.FetchByUUID,
    `${caseName}Message`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('uuid', program.resolveType('hash16'))
  );

  return new IREnumCase(caseName, messageData.getType(), messageID);
}

function buildCreateMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.ObjectCreate, object.id);
  const messageData = new IRObject(
    false,
    InternalStructID.Create,
    object.rpcGetCreateMsg()
  );

  messageData.addField(
    new IRObjectField('_replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('_timestamp', program.resolveType('f64'))
  );

  for (const field of object.getFields()) {
    messageData.addField(new IRObjectField(field.name, field.type));
  }

  return new IREnumCase(
    object.rpcGetCreateCase(),
    messageData.getType(),
    messageID
  );
}

type Vec4 = [number, number, number, number];

function u32FromBytesVecLE(vec4: Vec4) {
  let number = 0;
  number += vec4[0] << (8 * 0);
  number += vec4[1] << (8 * 1);
  number += vec4[2] << (8 * 2);
  number += vec4[3] << (8 * 3);
  return number;
}

function u32ToBytesVecLE(value: number): Vec4 {
  const vec: Vec4 = [0, 0, 0, 0];
  value |= 0;
  vec[0] = (value >> (8 * 0)) & 255;
  vec[1] = (value >> (8 * 1)) & 255;
  vec[2] = (value >> (8 * 2)) & 255;
  vec[3] = (value >> (8 * 3)) & 255;
  return vec;
}

function createUniqueID(
  category: RPCMessageCategory,
  objectID: number,
  fieldID: number = 0
): number {
  if (category > 255 || category < 0) throw new Error('Category overflow.');
  if (objectID > 65535 || objectID < 0) throw new Error('Object ID overflow.');
  if (fieldID > 255 || fieldID < 0) throw new Error('Field ID overflow.');
  const o = u32ToBytesVecLE(objectID);
  return u32FromBytesVecLE([category, o[0], o[1], fieldID]);
}
