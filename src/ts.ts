import { Writer } from './writer';
import * as IR from './ir';

const TypeNames: Record<IR.InternalTypeName, string> = Object.freeze({
  i8: 'number',
  i16: 'number',
  i32: 'number',
  i64: 'number',
  u8: 'number',
  u16: 'number',
  u32: 'number',
  u64: 'number',
  string: 'string',
  bool: 'boolean',
});

export class TypeScriptBackend {
  constructor(protected writer: Writer, protected program: IR.Program) {
    this.genHeader();
    this.genInterfaces();
  }

  write(chunk: string) {
    this.writer.write(chunk);
  }

  genHeader() {
    this.write('export type UUID = string;\n');
    this.write(
      'export type EnumMember<T, V> = {readonly type: T, readonly value: V};\n'
    );
  }

  genInterfaces() {
    for (const declaration of this.program.structures) {
      this.genStructInterface(declaration);
    }
    for (const declaration of this.program.enums) {
      this.genOneofInterface(declaration);
    }
    for (const declaration of this.program.objects) {
      this.genStructInterface(declaration);
    }
  }

  genStructInterface(declaration: IR.Structure | IR.RootObject) {
    this.write(`export interface ${declaration.name} {\n`);
    for (const data of declaration.fields) {
      if (data.type.kind === IR.TypeKind.RootObjectReference) {
        continue;
      }
      this.write('readonly ' + data.name + ': ');
      this.genType(data.type);
      this.write(';\n');
    }
    for (const data of declaration.fields) {
      if (data.type.kind === IR.TypeKind.RootObjectReference) {
        this.write('readonly load' + upper(data.name) + '(): Promise<');
        this.write(data.type.object.name);
        this.write(' | undefined>;\n');
        continue;
      }
    }
    this.write(`}\n`);
  }

  genOneofInterface(declaration: IR.Oneof) {
    this.write(`export const enum ${declaration.name}$Type {\n`);
    for (const data of declaration.cases) {
      this.write(data.name + ',\n');
    }
    this.write(`}\n`);

    this.write(`export type ${declaration.name} =\n`);
    this.writer.indent();
    for (let i = 0; i < declaration.cases.length; ++i) {
      const data = declaration.cases[i];
      this.write(`| EnumMember<${declaration.name}$Type.${data.name}, `);
      this.genType(data.type);
      this.write(i === declaration.cases.length - 1 ? '>;\n' : '>\n');
    }
    this.writer.dedent();
  }

  genType(type: IR.Type, open = 'readonly [', close = ']') {
    if (type.kind === IR.TypeKind.InternalPrimitive) {
      this.write(TypeNames[type.name]);
    } else if (type.kind == IR.TypeKind.OneofReference) {
      this.write(type.oneof.name);
    } else if (type.kind === IR.TypeKind.Struct) {
      this.write(type.struct.name);
    } else if (type.kind === IR.TypeKind.RootObjectReference) {
      this.write('UUID');
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

function upper(name: string) {
  if (name.length === 0) {
    return '';
  }

  return name[0].toUpperCase() + name.slice(1);
}
