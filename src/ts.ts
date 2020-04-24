import { Writer } from './writer';
import * as AST from './ast';

const TypeNames: Record<string, string | undefined> = Object.freeze({
  i8: 'number',
  i16: 'number',
  i32: 'number',
  i64: 'number',
  u8: 'number',
  u16: 'number',
  u32: 'number',
  u64: 'number',
  string: 'string',
});

export class TypeScriptBackend {
  constructor(protected writer: Writer, protected ast: AST.Root) {
    this.genHeader();
    this.genInterfaces();
  }

  write(chunk: string) {
    this.writer.write(chunk);
  }

  genHeader() {
    this.write('type UUID = string;\n');
  }

  genInterfaces() {
    for (const declaration of this.ast) {
      switch (declaration.kind) {
        case AST.DeclarationKind.Struct:
          this.genStruct(declaration);
          break;
        case AST.DeclarationKind.Oneof:
          this.genOneof(declaration);
          break;
      }
    }
  }

  genStruct(declaration: AST.StructDeclaration) {
    this.write(`interface ${declaration.name} {\n`);
    for (const member of declaration.members) {
      this.write(member.name + ': ');
      this.genType(member.type);
      this.write(';\n');
    }
    this.write(`}\n`);
  }

  genOneof(declaration: AST.OneofDeclaration) {}

  genType(type: AST.Type | string, open = '[', close = ']') {
    if (typeof type === 'string') {
      const name = TypeNames[type] || type;
      this.write(name);
    } else if (type.kind === AST.TypeKind.Primitive) {
      const name = TypeNames[type.name] || type.name;
      this.write(name);
    } else {
      this.write(open);
      for (let i = 0; i < type.members.length; ++i) {
        if (i > 0) {
          this.write(', ');
        }
        this.genType(type.members[i]);
      }
      this.write(close);
    }
  }
}
