import { ANTLRInputStream, CommonTokenStream } from 'antlr4ts';
import { ParseTreeWalker } from 'antlr4ts/tree/ParseTreeWalker';
import { VossLexer } from '../../grammar/VossLexer';
import {
  VossParser,
  StructDeclarationContext,
  StructMemberContext,
  OneofMemberContext,
  OneofDeclarationContext,
  ObjectDeclarationContext,
  PrimitiveTypeContext,
  ObjectFieldContext,
  ObjectViewContext,
} from '../../grammar/VossParser';
import { VossListener } from '../../grammar/VossListener';
import * as AST from './ast';

class GrammarListener implements VossListener {
  readonly declarations: AST.Declaration[] = [];
  private structMembers: AST.StructMember[] = [];
  private oneofMembers: AST.OneofMember[] = [];
  private objectMembers: AST.ObjectMember[] = [];
  private objectViews: AST.ObjectView[] = [];
  private currentTypesStack: AST.Type[] = [];
  private currentType?: AST.Type;

  exitStructMember(ctx: StructMemberContext) {
    const name = ctx.ID().toString();
    const type = this.currentType!;
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
    this.oneofMembers.push({
      name,
      type: {
        kind: AST.TypeKind.Primitive,
        name: type,
      },
    });
  }

  exitOneofDeclaration(ctx: OneofDeclarationContext) {
    const name = ctx.ID().toString();
    const members = this.oneofMembers;
    this.declarations.push({ kind: AST.DeclarationKind.Oneof, name, members });
    this.oneofMembers = [];
  }

  exitObjectField(ctx: ObjectFieldContext) {
    const name = ctx.ID().toString();
    this.objectMembers.push({ name, type: this.currentType! });
  }

  exitObjectView(ctx: ObjectViewContext) {
    const object = ctx.ID(0).toString();
    const via = ctx.ID(1).toString();
    const name = ctx.ID(2).toString();
    this.objectViews.push({ name, object, via });
  }

  exitObjectDeclaration(ctx: ObjectDeclarationContext) {
    const name = ctx.ID().toString();
    const members = this.objectMembers;
    const views = this.objectViews;
    this.declarations.push({
      kind: AST.DeclarationKind.Object,
      name,
      members,
      views,
    });
    this.objectMembers = [];
    this.objectViews = [];
  }

  exitPrimitiveType(ctx: PrimitiveTypeContext) {
    const newType: AST.PrimitiveType = {
      kind: AST.TypeKind.Primitive,
      name: ctx.ID().toString(),
    };
    this.currentTypesStack.push(newType);
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
