import * as AST from './ast';
import * as toposort from 'toposort';

export interface Program {
  structures: Structure[];
  objects: RootObject[];
  enums: Oneof[];
}

export const enum TypeKind {
  Struct = 'Struct',
  RootObjectReference = 'RootObject',
  OneofReference = 'Oneof',
  InternalPrimitive = 'InternalPrimitive',
  Tuple = 'Tuple',
}

export interface StructReferenceType {
  kind: TypeKind.Struct;
  struct: Structure;
}

export interface RootObjectReferenceType {
  kind: TypeKind.RootObjectReference;
  object: RootObject;
}

export interface OneofReferenceType {
  kind: TypeKind.OneofReference;
  oneof: Oneof;
}

export type InternalTypeName =
  | 'u8'
  | 'u16'
  | 'u32'
  | 'u64'
  | 'i8'
  | 'i16'
  | 'i32'
  | 'i64'
  | 'string'
  | 'bool';

export interface InternalPrimitiveType {
  kind: TypeKind.InternalPrimitive;
  name: InternalTypeName;
}

export interface TupleType {
  kind: TypeKind.Tuple;
  members: (InternalPrimitiveType | StructReferenceType)[];
}

export type Type =
  | StructReferenceType
  | RootObjectReferenceType
  | OneofReferenceType
  | InternalPrimitiveType
  | TupleType;

export interface FieldInfo {
  name: string;
  type: Type;
}

export const enum DeclarationType {
  Structure,
  RootObject,
  Oneof,
}

export interface Structure {
  type: DeclarationType.Structure;
  name: string;
  fields: FieldInfo[];
}

export interface RootObject {
  type: DeclarationType.RootObject;
  name: string;
  fields: FieldInfo[];
}

export interface OneofCase {
  name: string;
  type: StructReferenceType;
}

export interface Oneof {
  type: DeclarationType.Oneof;
  name: string;
  cases: OneofCase[];
}

const InternalTypes = new Set<InternalTypeName>([
  'u8',
  'u16',
  'u32',
  'u64',
  'i8',
  'i16',
  'i32',
  'i64',
  'string',
  'bool',
]);

export function build(tree: AST.Root) {
  const declarationsMap = new Map<string, AST.Declaration>();
  let dependenciesGraph: [string, string][] = [];

  for (const declaration of tree) {
    if (InternalTypes.has(declaration.name as any)) {
      throw new Error('Cannot redeclare an internal type.');
    }

    if (declarationsMap.has(declaration.name)) {
      throw new Error(`Name already in use: ${declaration.name}`);
    }

    declarationsMap.set(declaration.name, declaration);

    const memberNames = new Set<string>();

    for (const member of declaration.members) {
      const types = extractTypes(member.type);

      if (types.length === 0) {
        throw new Error('Cannot extract types.');
      }

      for (const type of types) {
        dependenciesGraph.push([declaration.name, type]);
      }

      if (memberNames.has(member.name)) {
        throw new Error(`Member '${member.name}' is already defined.`);
      }

      memberNames.add(member.name);
    }
  }

  const sorted = [
    ...new Set([...toposort(dependenciesGraph), ...declarationsMap.keys()]),
  ]
    .reverse()
    .filter((name) => declarationsMap.has(name))
    .map((name) => declarationsMap.get(name)!);

  const generated = new Map<string, Structure | RootObject | Oneof>();

  const getType = (type: string | AST.Type): Type => {
    const getPrimitiveType = (name: string): Type => {
      if (isInternal(name)) {
        return {
          kind: TypeKind.InternalPrimitive,
          name,
        };
      }

      const declaration = generated.get(name);
      if (!declaration) {
        throw new Error(`Cannot resolve type ${name}.`);
      }
      switch (declaration.type) {
        case DeclarationType.Structure:
          return { kind: TypeKind.Struct, struct: declaration };
        case DeclarationType.RootObject:
          return { kind: TypeKind.RootObjectReference, object: declaration };
        case DeclarationType.Oneof:
          return { kind: TypeKind.OneofReference, oneof: declaration };
      }
    };

    if (typeof type === 'string') {
      return getPrimitiveType(type);
    }

    if (type.kind === AST.TypeKind.Primitive) {
      return getPrimitiveType(type.name);
    }

    const convert = (t: AST.Type): Type => {
      if (t.kind === AST.TypeKind.Primitive) {
        return getPrimitiveType(t.name);
      } else {
        return {
          kind: TypeKind.Tuple,
          members: t.members.map(convert).filter((t2) => {
            if (
              t2.kind === TypeKind.InternalPrimitive ||
              t2.kind === TypeKind.Struct
            ) {
              return true;
            }
            throw new Error(
              'Complex tuples such as this one are not supported.'
            );
          }) as any,
        };
      }
    };

    return convert(type);
  };

  const program: Program = {
    structures: [],
    objects: [],
    enums: [],
  };

  for (const declaration of sorted) {
    switch (declaration.kind) {
      case AST.DeclarationKind.Struct: {
        const fields: FieldInfo[] = [];
        for (const member of declaration.members) {
          fields.push({
            name: member.name,
            type: getType(member.type),
          });
        }
        const struct: Structure = {
          type: DeclarationType.Structure,
          name: declaration.name,
          fields,
        };
        generated.set(struct.name, struct);
        program.structures.push(struct);
        break;
      }
      case AST.DeclarationKind.Object: {
        const fields: FieldInfo[] = [];
        for (const member of declaration.members) {
          fields.push({
            name: member.name,
            type: getType(member.type),
          });
        }
        const object: RootObject = {
          type: DeclarationType.RootObject,
          name: declaration.name,
          fields,
        };
        generated.set(object.name, object);
        program.objects.push(object);
        break;
      }
      case AST.DeclarationKind.Oneof: {
        const cases: OneofCase[] = [];
        for (const member of declaration.members) {
          const type = getType(member.type);
          if (type.kind !== TypeKind.Struct) {
            throw new Error('Non struct types are not allowed in Oneof cases.');
          }
          cases.push({
            name: member.name,
            type,
          });
        }
        const oneof: Oneof = {
          type: DeclarationType.Oneof,
          name: declaration.name,
          cases,
        };
        generated.set(oneof.name, oneof);
        program.enums.push(oneof);
        break;
      }
    }
  }

  return program;
}

function extractTypes(type: string | AST.Type): string[] {
  if (typeof type === 'string') {
    return [type];
  } else if (type.kind === AST.TypeKind.Primitive) {
    return [type.name];
  }

  const result = new Set<string>();

  const visit = (t: AST.Type): void => {
    if (t.kind === AST.TypeKind.Primitive) {
      result.add(t.name);
    } else {
      for (const member of t.members) {
        visit(member);
      }
    }
  };

  visit(type);

  return [...result];
}

function isInternal(name: string): name is InternalTypeName {
  return InternalTypes.has(name as any);
}