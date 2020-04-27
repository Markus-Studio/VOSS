import { IREnum, IREnumCase } from './enum';
import { Program } from './program';
import { IRObject, IRObjectField } from './object';
import { toPascalCase } from 'src/utils';

const enum RPCMessageCategory {
  Clock = 0,
  RootFetch = 1,
  ViewFetch = 2,
  ObjectSet = 3,
  ObjectCreate = 4,
}

export enum InternalStructID {
  ClockData = 1,
}

export function buildRPC(program: Program): IREnum {
  const rpcMessages = new IREnum(0, '_RPCMessage');
  const objects = [...program.getObjects()];

  rpcMessages.addCase(buildClockMessage(program));

  for (const object of objects) {
    if (object.isRoot && !object.isViewed()) {
      rpcMessages.addCase(buildRootFetchMessage(program, object));
    }
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

function buildRootFetchMessage(program: Program, object: IRObject): IREnumCase {
  const messageID = createUniqueID(RPCMessageCategory.RootFetch, object.id);
  const rootFetchData = new IRObject(
    false,
    InternalStructID.ClockData,
    '_rootFetch' + toPascalCase(object.name) + 'Request'
  );
  program.addObject(rootFetchData);
  return new IREnumCase(
    'RootFetch' + toPascalCase(object.name),
    program.resolveType(rootFetchData.name),
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
