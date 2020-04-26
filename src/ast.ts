export type Root = Declaration[];

export const enum DeclarationKind {
  Struct,
  Oneof,
  Object,
}

export type Declaration =
  | StructDeclaration
  | OneofDeclaration
  | ObjectDeclaration;

export interface StructDeclaration {
  kind: DeclarationKind.Struct;
  name: string;
  members: StructMember[];
}

export interface StructMember {
  name: string;
  type: Type;
}

export interface OneofDeclaration {
  kind: DeclarationKind.Oneof;
  name: string;
  members: OneofMember[];
}

export interface OneofMember {
  name: string;
  type: string;
}

export interface ObjectDeclaration {
  kind: DeclarationKind.Object;
  name: string;
  members: ObjectMember[];
  views: ObjectView[];
}

export interface ObjectMember {
  name: string;
  type: Type;
}

export interface ObjectView {
  name: string;
  object: string;
  via: string;
}

export type Type = PrimitiveType | TupleType;

export const enum TypeKind {
  Primitive,
  Tuple,
}

export interface PrimitiveType {
  kind: TypeKind.Primitive;
  name: string;
}

export interface TupleType {
  kind: TypeKind.Tuple;
  members: Type[];
}
