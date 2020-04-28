import { IREnum, IREnumCase } from './enum';
import { Program } from './program';
import { IRObject, IRObjectField, IRView } from './object';
import { toPascalCase } from '../utils';

const enum RPCMessageCategory {
  Clock = 0,
  Reply = 1,
  RootFetch = 2,
  ViewFetch = 3,
  ObjectSet = 4,
  ObjectCreate = 5,
  ObjectDelete = 6,
}

export enum InternalStructID {
  ClockData = 0,
  ReplyData = 1,
  SetRequests = 2,
  FetchRequests = 3,
}

export function buildRPC(program: Program): IREnum {
  const rpcMessages = new IREnum(0, '_RPCMessage');
  const objects = [...program.getObjects()];

  rpcMessages.addCase(buildClockMessage(program));
  rpcMessages.addCase(buildReplyMessage(program));

  for (const object of objects) {
    if (!object.isRoot) continue;

    if (!object.isViewed()) {
      rpcMessages.addCase(buildRootFetchMessage(program, object));
    }

    let counter = 0;
    for (const field of object.getFields()) {
      rpcMessages.addCase(buildSetFieldMessage(program, field, counter++));
    }

    counter = 0;
    for (const view of object.getViews()) {
      rpcMessages.addCase(buildFetchViewMessage(program, view, counter++));
    }

    rpcMessages.addCase(buildDeleteMessage(program, object));
    rpcMessages.addCase(buildCreateMessage(program, object));
  }

  return rpcMessages;
}

function buildClockMessage(program: Program): IREnumCase {
  const messageID = u32FromBytesVecLE([RPCMessageCategory.Clock, 0, 0, 0]);
  const clockData = new IRObject(
    false,
    InternalStructID.ClockData,
    '_ClockData'
  );
  clockData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );
  program.addObject(clockData);
  return new IREnumCase(
    'Clock',
    program.resolveType(clockData.name),
    messageID
  );
}

function buildReplyMessage(program: Program): IREnumCase {
  const messageID = u32FromBytesVecLE([RPCMessageCategory.Reply, 0, 0, 0]);
  const messageData = new IRObject(
    false,
    InternalStructID.ClockData,
    '_ReplyData'
  );
  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );
  program.addObject(messageData);
  return new IREnumCase(
    'Reply',
    program.resolveType(messageData.name),
    messageID
  );
}

function buildRootFetchMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.RootFetch, object.id);
  const caseName = 'RootFetch' + toPascalCase(object.name);
  const messageData = new IRObject(
    false,
    InternalStructID.ClockData,
    `_${caseName}Request`
  );
  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );
  program.addObject(messageData);
  return new IREnumCase(
    caseName,
    program.resolveType(messageData.name),
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
  const objectName = toPascalCase(object.name);
  const fieldName = toPascalCase(field.name);
  const caseName = 'Object' + objectName + 'Set' + fieldName;
  const messageData = new IRObject(
    false,
    InternalStructID.SetRequests,
    `_${caseName}Request`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );

  const fieldType = field.type.isRootObject
    ? program.resolveType('uuid')
    : field.type;

  messageData.addField(new IRObjectField('previousValue', fieldType));
  messageData.addField(new IRObjectField('newValue', fieldType));

  program.addObject(messageData);
  return new IREnumCase(
    caseName,
    program.resolveType(messageData.name),
    messageID
  );
}

function buildFetchViewMessage(
  program: Program,
  view: IRView,
  id: number
): IREnumCase {
  const object = view.getHost();
  const messageID = createUniqueID(RPCMessageCategory.ViewFetch, object.id, id);
  const objectName = toPascalCase(object.name);
  const viewName = toPascalCase(view.name);
  const caseName = 'Object' + objectName + 'Fetch' + viewName;
  const messageData = new IRObject(
    false,
    InternalStructID.FetchRequests,
    `_${caseName}Request`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('hostUUID', program.resolveType('uuid'))
  );

  program.addObject(messageData);
  return new IREnumCase(
    caseName,
    program.resolveType(messageData.name),
    messageID
  );
}

function buildDeleteMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.ObjectDelete, object.id);
  const objectName = toPascalCase(object.name);
  const caseName = 'Object' + objectName + 'Delete';
  const messageData = new IRObject(
    false,
    InternalStructID.FetchRequests,
    `_${caseName}Request`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );

  messageData.addField(new IRObjectField('uuid', program.resolveType('uuid')));

  program.addObject(messageData);
  return new IREnumCase(
    caseName,
    program.resolveType(messageData.name),
    messageID
  );
}

function buildCreateMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.ObjectCreate, object.id);
  const objectName = toPascalCase(object.name);
  const caseName = 'Object' + objectName + 'Create';
  const messageData = new IRObject(
    false,
    InternalStructID.FetchRequests,
    `_${caseName}Request`
  );

  messageData.addField(
    new IRObjectField('replyId', program.resolveType('u32'))
  );

  messageData.addField(
    new IRObjectField('timestamp', program.resolveType('f64'))
  );

  messageData.addField(
    new IRObjectField('data', program.resolveType(object.name))
  );

  program.addObject(messageData);
  return new IREnumCase(
    caseName,
    program.resolveType(messageData.name),
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
