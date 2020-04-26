import * as AST from '../ast';
import { Counter } from '../counter';
import * as toposort from 'toposort';
import { Program } from './program';
import { IRObject, IRObjectField } from './object';
import { IREnum, IREnumCase } from './enum';

export function genIR(ast: AST.Root) {
  const declaration2id = new Map<AST.Declaration, number>();
  const name2declaration = new Map<string, AST.Declaration>();
  const counter = new Counter<AST.DeclarationKind>();
  const dependencyGraph: [string, string][] = [];

  for (const declaration of ast) {
    const id = counter.incr(declaration.kind);
    const name = declaration.name;
    declaration2id.set(declaration, id);

    if (name2declaration.has(name)) {
      throw new Error(`Name ${name} is already in use.`);
    }

    name2declaration.set(name, declaration);

    for (const member of declaration.members) {
      dependencyGraph.push([name, member.type.name]);
    }
  }

  // Compute the execution plan by topologically sorting the decelerations.
  let declarations: Set<AST.Declaration>;
  try {
    const sorted: AST.Declaration[] = toposort(dependencyGraph)
      .reverse()
      .map((name) => name2declaration.get(name)!)
      .filter((declaration) => declaration !== undefined);
    declarations = new Set([...sorted, ...ast]);
  } catch (e) {
    throw new Error(`Circular reference found.`);
  }

  const program = new Program();

  type FactoryCb<T> = (program: Program, id: number, value: T) => void;
  const factories = {
    [AST.DeclarationKind.Object]: genRootObject,
    [AST.DeclarationKind.Struct]: genStructure,
    [AST.DeclarationKind.Oneof]: genEnum,
  };

  for (const declaration of declarations) {
    const id = declaration2id.get(declaration)!;
    const factory = factories[declaration.kind] as FactoryCb<
      typeof declaration
    >;
    factory(program, id, declaration);
  }

  return program;
}

function genRootObject(
  program: Program,
  id: number,
  declaration: AST.ObjectDeclaration
) {
  const object = new IRObject(true, id, declaration.name);
  program.addObject(object);

  for (const fieldDeclaration of declaration.members) {
    genField(program, object, fieldDeclaration);
  }

  // TODO(qti3e) Build views.
}

function genStructure(
  program: Program,
  id: number,
  declaration: AST.StructDeclaration
) {
  const object = new IRObject(false, id, declaration.name);
  program.addObject(object);

  for (const fieldDeclaration of declaration.members) {
    genField(program, object, fieldDeclaration);
  }
}

function genField(
  program: Program,
  object: IRObject,
  declaration: AST.ObjectMember | AST.StructMember
) {
  const type = program.resolveType(declaration.type.name);
  const field = new IRObjectField(declaration.name, type);
  object.addField(field);
}

function genEnum(
  program: Program,
  id: number,
  declaration: AST.OneofDeclaration
) {
  const irEnum = new IREnum(id, declaration.name);
  program.addEnum(irEnum);

  for (const caseDeclaration of declaration.members) {
    genEnumCase(program, irEnum, caseDeclaration);
  }
}

function genEnumCase(
  program: Program,
  owner: IREnum,
  declaration: AST.OneofMember
) {
  const type = program.resolveType(declaration.type.name);
  const enumCase = new IREnumCase(declaration.name, type);
  owner.addCase(enumCase);
}
