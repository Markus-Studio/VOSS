export type Root = Declaration[];

export const enum DeclarationKind {
  Struct,
}

export type Declaration = StructDeclaration;

export interface StructDeclaration {
  kind: DeclarationKind.Struct;
  name: string;
  members: StructMember[];
}

export interface StructMember {
  name: string;
  type: string;
}
