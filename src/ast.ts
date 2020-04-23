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
  type: string;
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
}

export interface ObjectMember {
  name: string;
  type: string;
}
