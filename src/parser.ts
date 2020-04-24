import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { VossLexer } from '../grammar/VossLexer';
import {
  VossParser,
  StructDeclarationContext,
  StructMemberContext,
  OneofMemberContext,
  OneofDeclarationContext,
  ObjectMemberContext,
  ObjectDeclarationContext,
  PrimitiveTypeContext,
} from '../grammar/VossParser';
import { VossListener } from '../grammar/VossListener';
import * as AST from './ast';

class GrammarListener implements VossListener {
  readonly declarations: AST.Declaration[] = [];
  private structMembers: AST.StructMember[] = [];
  private oneofMembers: AST.OneofMember[] = [];
  private objectMembers: AST.ObjectMember[] = [];
  private currentTypesStack: AST.Type[] = [];
  private currentType?: AST.Type;

  exitStructMember(ctx: StructMemberContext) {
    const name = ctx.ID(0).toString();
    const type = ctx.ID(0).toString();
    this.structMembers.push({ name, type });
  }

  exitStructDeclaration(ctx: StructDeclarationContext) {
    const name = ctx.ID().toString();
    const members = this.structMembers;
    this.declarations.push({ kind: AST.DeclarationKind.Struct, name, members });
    this.structMembers = [];
  }

  exitOneofMember(ctx: OneofMemberContext) {
    const [nameTerminal, typeTerminal] = ctx.ID();
    const name = nameTerminal.toString();
    const type = (typeTerminal || nameTerminal).toString();
    this.oneofMembers.push({ name, type });
  }

  exitOneofDeclaration(ctx: OneofDeclarationContext) {
    const name = ctx.ID().toString();
    const members = this.oneofMembers;
    this.declarations.push({ kind: AST.DeclarationKind.Oneof, name, members });
    this.oneofMembers = [];
  }

  exitObjectMember(ctx: ObjectMemberContext) {
    const name = ctx.ID().toString();
    this.objectMembers.push({ name, type: this.currentType! });
  }

  exitObjectDeclaration(ctx: ObjectDeclarationContext) {
    const name = ctx.ID().toString();
    const members = this.objectMembers;
    this.declarations.push({ kind: AST.DeclarationKind.Object, name, members });
    this.objectMembers = [];
  }

  enterTupleType() {
    const newType: AST.TupleType = { kind: AST.TypeKind.Tuple, members: [] };
    this.currentTypesStack.push(newType);
  }

  exitPrimitiveType(ctx: PrimitiveTypeContext) {
    const newType: AST.PrimitiveType = {
      kind: AST.TypeKind.Primitive,
      name: ctx.ID().toString(),
    };
    this.currentTypesStack.push(newType);
  }

  exitTupleMember() {
    const member = this.currentTypesStack.pop()!;
    const tuple = this.currentTypesStack[this.currentTypesStack.length - 1];
    if (tuple.kind !== AST.TypeKind.Tuple) {
      throw new Error('Expected tuple to be on the top of stack.');
    }
    tuple.members.push(member!);
  }

  exitType() {
    if (this.currentTypesStack.length !== 1) {
      throw new Error('Unexpected tree.');
    }
    this.currentType = this.currentTypesStack.pop()!;
  }
}

export function parse(source: string): AST.Root {
  // Create the lexer and parser
  let inputStream = new ANTLRInputStream(source);
  let lexer = new VossLexer(inputStream);
  let tokenStream = new CommonTokenStream(lexer);
  let parser = new VossParser(tokenStream);
  // Construct the parse tree and send stuff to the listener in order
  // to create the declarations list.
  let tree = parser.parse();
  const listener = new GrammarListener();
  ParseTreeWalker.DEFAULT.walk(listener as VossListener, tree);
  return listener.declarations;
}
