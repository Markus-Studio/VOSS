import * as AST from './ast';
import * as toposort from 'toposort';

export interface Program {
  structures: Structure[];
  objects: RootObject[];
  enums: Oneof[];
  rpc: Oneof;
}

export const enum TypeKind {
  Struct = 'Struct',
  RootObjectReference = 'RootObject',
  OneofReference = 'Oneof',
  InternalPrimitive = 'InternalPrimitive'
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
  | 'i8'
  | 'i16'
  | 'i32'
  | 'f32'
  | 'f64'
  | 'string'
  | 'bool';

export interface InternalPrimitiveType {
  kind: TypeKind.InternalPrimitive;
  name: InternalTypeName;
}

export type Type =
  | StructReferenceType
  | RootObjectReferenceType
  | OneofReferenceType
  | InternalPrimitiveType;

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
  id: number;
  fields: FieldInfo[];
}

export interface RootObject {
  type: DeclarationType.RootObject;
  name: string;
  id: number;
  fields: FieldInfo[];
  views: View[];
  viewedIn: ViewRef[];
}

export interface View {
  name: string;
  object: RootObject;
  via: string;
}

export interface ViewRef {
  host: RootObject;
  as: string;
  via: string;
}

export interface OneofCase {
  name: string;
  type: StructReferenceType;
  value: number;
}

export interface Oneof {
  type: DeclarationType.Oneof;
  id: number;
  name: string;
  cases: OneofCase[];
}

const InternalTypes = new Set<InternalTypeName>([
  'u8',
  'u16',
  'u32',
  'i8',
  'i16',
  'i32',
  'f32',
  'f64',
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

    if (declaration.kind === AST.DeclarationKind.Object) {
      for (const view of declaration.views) {
        if (memberNames.has(view.name)) {
          throw new Error(`Member '${view.name}' is already defined.`);
        }
        memberNames.add(view.name);
      }
    }
  }

  const declaration2ID = new Map<AST.Declaration, number>();
  let nextStructID = 0;
  let nextObjectID = 0;
  let nextEnumID = 0;
  for (const declaration of tree) {
    switch (declaration.kind) {
      case AST.DeclarationKind.Struct:
        declaration2ID.set(declaration, nextStructID++);
        break;
      case AST.DeclarationKind.Object:
        declaration2ID.set(declaration, nextObjectID++);
        break;
      case AST.DeclarationKind.Oneof:
        declaration2ID.set(declaration, nextEnumID++);
        break;
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
      return getPrimitiveType(t.name);
    };

    return convert(type);
  };

  const program: Program = {
    structures: [],
    objects: [],
    enums: [],
    rpc: {
      type: DeclarationType.Oneof,
      name: 'RPCMessage',
      id: NaN,
      cases: [],
    }
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
          id: declaration2ID.get(declaration)!,
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
          id: declaration2ID.get(declaration)!,
          views: [],
          viewedIn: [],
          fields,
        };
        generated.set(object.name, object);
        program.objects.push(object);
        break;
      }
      case AST.DeclarationKind.Oneof: {
        const cases: OneofCase[] = [];
        let value = 0;
        for (const member of declaration.members) {
          const type = getType(member.type);
          if (type.kind !== TypeKind.Struct) {
            throw new Error('Non struct types are not allowed in Oneof cases.');
          }
          cases.push({
            name: member.name,
            value: value++,
            type,
          });
        }
        const oneof: Oneof = {
          type: DeclarationType.Oneof,
          name: declaration.name,
          id: declaration2ID.get(declaration)!,
          cases,
        };
        generated.set(oneof.name, oneof);
        program.enums.push(oneof);
        break;
      }
    }
  }

  for (const declaration of tree) {
    if (declaration.kind !== AST.DeclarationKind.Object) {
      continue;
    }

    for (const view of declaration.views) {
      const target = generated.get(declaration.name)!;

      const object = generated.get(view.object);
      if (!object) {
        throw new Error(`Cannot resolve object ${view.object}`);
      }
      if (object.type !== DeclarationType.RootObject) {
        throw new Error(`${view.object} is not a root object.`);
      }
      const field = object.fields.find((f) => f.name === view.via);
      if (!field) {
        throw new Error(`${view.via} does not exists on ${view.object}`);
      }
      if (
        field.type.kind !== TypeKind.RootObjectReference ||
        field.type.object !== target
      ) {
        throw new Error(
          `${view.via} on ${view.object} is not of type ${declaration.name}`
        );
      }

      target.views.push({
        name: view.name,
        object,
        via: view.via,
      });

      object.viewedIn.push({
        host: target,
        as: view.name,
        via: view.via,
      });
    }
  }

  buildRPC(program);

  return program;
}

function buildRPC(program: Program) {
  const cases = program.rpc.cases;

  const clockData: Structure = {
    type: DeclarationType.Structure,
    name: 'RPC$ClockData',
    id: NaN,
    fields: [
      {
        name: 'timestamp',
        type: {
          kind: TypeKind.InternalPrimitive,
          name: 'f64',
        },
      },
    ],
  };

  program.structures.push(clockData);

  cases.push({
    name: 'clock',
    value: 1,
    type: {
      kind: TypeKind.Struct,
      struct: clockData
    },
  });
}

function extractTypes(type: string | AST.Type): string[] {
  if (typeof type === 'string') {
    return [type];
  } else if (type.kind === AST.TypeKind.Primitive) {
    return [type.name];
  }

  const result = new Set<string>();

  const visit = (t: AST.Type): void => {
    result.add(t.name);
  };

  visit(type);

  return [...result];
}

function isInternal(name: string): name is InternalTypeName {
  return InternalTypes.has(name as any);
}
