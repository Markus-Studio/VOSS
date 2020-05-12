import { SymbolTable } from './symbols';
import { isIdentifier, removeCommonIndent } from './utils';
import { Writer } from './writer';
import { ComponentConstructor } from './component';
import {
  ContainerComponent,
  IfComponent,
  ForComponent,
  TextComponent,
  BindComponent,
  LineComponent,
} from './collections/builtin';
import { toPascalCase, toCamelCase, toSnakeCase } from '../utils';
import { compile } from './compiler';
import * as pluralize from 'pluralize';

export type Pipe = (value: any) => any;

export class Context {
  readonly table = new SymbolTable();
  private readonly pipes = new Map<string, Pipe>();
  private readonly components = new Map<string, ComponentConstructor>();
  readonly writer = new Writer();

  constructor() {
    this.component('container', ContainerComponent);
    this.component('text', TextComponent);
    this.component('line', LineComponent);
    this.component('bind', BindComponent);
    this.component('if', IfComponent);
    this.component('for', ForComponent);
    this.pipe('pascal', toPascalCase);
    this.pipe('camel', toCamelCase);
    this.pipe('snake', toSnakeCase);
    this.pipe('plural', pluralize);
    this.pipe('call', (fn: any) => fn());
  }

  bind(name: string, value: any): void {
    this.table.bind(name, value);
  }

  resolve(name: string): any {
    return this.table.resolve(name);
  }

  pipe(name: string, callback: Pipe): void {
    if (!isIdentifier(name)) {
      throw new Error('Pipe name must be a valid identifer.');
    }

    if (this.pipes.has(name)) {
      throw new Error(`Pipe ${name} is already defined.`);
    }

    this.pipes.set(name, callback);
  }

  resolvePipe(name: string): Pipe {
    if (!this.pipes.has(name)) {
      throw new Error(`Pipe ${name} is not defined.`);
    }

    return this.pipes.get(name)!;
  }

  component(selector: string, constructor: ComponentConstructor) {
    if (this.components.has(selector)) {
      throw new Error(`Component ${selector} is already defined.`);
    }

    this.components.set(selector, constructor);
  }

  resolveComponent(selector: string): ComponentConstructor {
    if (!this.components.has(selector)) {
      throw new Error(`Component ${selector} is not defined.`);
    }

    return this.components.get(selector)!;
  }

  run(template: string): void {
    template = removeCommonIndent(template.split(/\r?\n/g)).join('\n');
    const component = compile(this, template);
    component.write(this);
  }

  data() {
    return this.writer.data();
  }
}
