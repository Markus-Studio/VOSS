import { Context } from '../context';
import { Component } from '../component';

export class InterfaceComponent extends Component {
  render() {
    const name = this.attr('name');
    this.context.writer.writeLine(`interface ${name} {`);
    this.context.writer.indent();

    this.content();

    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class InterfaceMemberComponent extends Component {
  render() {
    const name = this.attr('name');
    const type = this.attr('type');
    const optional = this.attr('type');
    this.context.writer.writeLine(`${name}${optional ? '?' : ''}: ${type};`);
  }
}

export class ClassComponent extends Component {
  render() {
    const name = this.attr('name');
    this.context.writer.writeLine(`class ${name} {`);
    this.context.writer.indent();

    this.content();

    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export function register(context: Context) {
  context.component('interface', InterfaceComponent);
  context.component('interface-member', InterfaceMemberComponent);
}
