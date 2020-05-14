import { Context } from '../context';
import { Component } from '../component';

export class StructComponent extends Component {
  render() {
    const name = this.attr('name');
    const derive = this.list('derive');
    const pub = this.attr('pub');
    const x = pub ? 'pub ' : '';
    const d = derive.length ? `#[derive(${derive.join(', ')})]\n` : '';

    this.context.writer.writeLine(`${d}${x}struct ${name} {`);
    this.context.writer.indent();

    this.content();

    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class StructMemberComponent extends Component {
  render() {
    const name = this.attr('name');
    const type = this.attr('type');
    const pub = this.attr('pub');
    this.context.writer.writeLine(`${pub ? 'pub ' : ''}${name}: ${type},`);
  }
}

export class ImplComponent extends Component {
  render() {
    const name = this.attr('name');
    const For = this.attr('for');
    const time = this.attr('time');

    const t = time ? "<'" + time + '>' : '';
    const head = name ? `${name} for ${For}` : For;

    this.context.writer.writeLine(`impl${t} ${head} {`);
    this.context.writer.indent();

    this.content();

    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class MethodComponent extends Component {
  render() {
    const name = this.attr('name');
    const type = this.attr('type');
    const pub = this.attr('pub');
    const head = (pub ? 'pub ' : '') + 'fn ' + name + '(';
    this.context.writer.write(head);
    this.content(ParameterComponent, ', ');
    this.context.writer.write(`) -> ${type} {\n`);
    this.context.writer.indent();
    this.content();
    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class ParameterComponent extends Component {
  render() {
    const name = this.attr('name');
    let type = this.attr('type');
    const mut = this.attr('mut');
    const ref = this.attr('ref');
    const lifetime = this.attr('time');
    if (mut) type = 'mut ' + type;
    if (lifetime) type = "'" + lifetime + type;
    if (ref) type = '&' + type;
    this.context.writer.write(`${name}: ${type}`);
  }
}

export class SelfParameterComponent extends ParameterComponent {
  render() {
    const mut = this.attr('mut');
    const ref = this.attr('ref');
    const lifetime = this.attr('time');
    let result = 'self';
    if (mut) result = 'mut ' + result;
    if (lifetime) result = "'" + lifetime + ' ' + result;
    if (ref) result = '&' + result;
    this.context.writer.write(result);
  }
}

export class EnumComponent extends Component {
  render() {
    const name = this.attr('name');
    const pub = this.attr('pub');
    const derive = this.list('derive');
    const d = derive.length ? `#[derive(${derive.join(', ')})]\n` : '';
    this.context.writer.writeLine(`${d}${pub ? 'pub ' : ''}enum ${name} {`);
    this.context.writer.indent();
    this.content();
    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class EnumMemberComponent extends Component {
  render() {
    const name = this.attr('name');
    const type = this.attr('type');
    this.context.writer.writeLine(`${name}(${type}),`);
  }
}

export function register(context: Context) {
  context.component('struct', StructComponent);
  context.component('struct-member', StructMemberComponent);
  context.component('impl', ImplComponent);
  context.component('method', MethodComponent);
  context.component('parameter', ParameterComponent);
  context.component('self-parameter', SelfParameterComponent);
  context.component('enum', EnumComponent);
  context.component('enum-member', EnumMemberComponent);
}
