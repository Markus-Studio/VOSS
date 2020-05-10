import { Context } from './context';
import { Component } from './component';

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

export function register(context: Context) {
  context.component('interface', InterfaceComponent);
}
