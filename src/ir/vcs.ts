import { Program } from './program';
import { IREnum, IREnumCase } from './enum';
import { IRObject } from './object';
import { IRObjectField } from './field';
import { createUniqueID } from '../utils';

const enum VCSActionCategory {
  ObjectDelete = 0,
  ObjectCreate = 1,
  ObjectSet = 2,
}

export enum InternalStructID {
  Delete = 16,
  Create = 17,
  Set = 18,
}

export function buildVCS(program: Program): IREnum {
  const actions = new IREnum(1, 'VossAction');

  actions.addCase(buildDeleteAction(program));

  for (const object of program.getObjects()) {
    if (!object.isRoot) continue;
    actions.addCase(buildCreateAction(program, object));
    let id = 0;
    for (const field of object.getFields())
      actions.addCase(buildSetAction(program, object, field, id++));
  }

  return actions;
}

function buildDeleteAction(program: Program): IREnumCase {
  const type = new IRObject(false, InternalStructID.Delete, 'DeleteAction');

  type.addField(new IRObjectField('author', program.resolveType('hash16')));
  type.addField(new IRObjectField('time', program.resolveType('f64')));
  type.addField(new IRObjectField('object', program.resolveType('hash16')));

  return new IREnumCase(
    'Delete',
    type.getType(),
    VCSActionCategory.ObjectDelete
  );
}

function buildCreateAction(program: Program, object: IRObject): IREnumCase {
  const id = createUniqueID(VCSActionCategory.ObjectCreate, object.id);
  const name = 'Create' + object.pascalCase + 'Action';
  const type = new IRObject(false, InternalStructID.Create, name);

  type.addField(new IRObjectField('_author', program.resolveType('hash16')));
  type.addField(new IRObjectField('_time', program.resolveType('f64')));
  for (const field of object.getFields())
    type.addField(new IRObjectField(field.name, field.type));

  return new IREnumCase(name, type.getType(), id);
}

function buildSetAction(
  program: Program,
  object: IRObject,
  field: IRObjectField,
  i: number
): IREnumCase {
  const id = createUniqueID(VCSActionCategory.ObjectSet, object.id, i);
  const name = object.pascalCase + 'Set' + field.pascalCase + 'Action';
  const type = new IRObject(false, InternalStructID.Set, name);

  type.addField(new IRObjectField('author', program.resolveType('hash16')));
  type.addField(new IRObjectField('time', program.resolveType('f64')));
  type.addField(new IRObjectField('value', field.type));

  return new IREnumCase(name, type.getType(), id);
}
