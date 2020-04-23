export type Root = Declaration[];

export const enum DeclarationKind {
  Struct,
  Oneof,
}

export type Declaration = StructDeclaration | OneofDeclaration;

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
