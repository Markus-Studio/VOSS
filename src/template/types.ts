export type FileName = string;
export type ComponentName = string;
export type ComponentsMap = Record<ComponentName, FileName>;

export enum TokenKind {
  Character,
  OpenTag,
  EndTag,
  Comment,
  Expression,
}

export interface CharacterToken {
  kind: TokenKind.Character;
  character: string;
}

export interface OpenTagToken {
  kind: TokenKind.OpenTag;
  name: string;
  selfClosing: boolean;
  attributes: Record<string, string>;
  children: Node[];
}

export interface EndTagToken {
  kind: TokenKind.EndTag;
  name: string;
}

export interface CommentToken {
  kind: TokenKind.Comment;
  data: string;
}

export interface ExpressionToken {
  kind: TokenKind.Expression;
  expr: string;
}

export type TextNode = CharacterToken;

export type Token =
  | CharacterToken
  | OpenTagToken
  | EndTagToken
  | CommentToken
  | ExpressionToken
  | TextNode;

export type Node = ExpressionToken | OpenTagToken | TextNode;
