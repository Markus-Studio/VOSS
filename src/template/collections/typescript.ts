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
    const optional = this.attr('optional');
    const readonly = this.attr('readonly');
    this.context.writer.writeLine(
      `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}: ${type};`
    );
  }
}

export class ClassComponent extends Component {
  render() {
    const name = this.attr('name');
    const parents = this.list('extend');
    const interfaces = this.list('implement');
    const e = parents.length ? ` extends ${parents.join(', ')}` : '';
    const i = interfaces.length ? ` implements ${interfaces.join(', ')}` : '';

    this.context.writer.writeLine(`class ${name}${e}${i} {`);
    this.context.writer.indent();

    this.content(PropertyComponent);
    this.content();

    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class PropertyComponent extends Component {
  render() {
    const staticTag = this.attr('static');
    const protectedTag = this.attr('protected');
    const privateTag = this.attr('private');
    const readonlyTag = this.attr('readonly');
    const optionalTag = this.attr('optional');
    const name = this.attr('name');
    const defaultValue = this.attr('default');
    const type = this.attr('type');

    if (staticTag + protectedTag + privateTag > 1) {
      throw new Error('Only one active visibility is allowed.');
    }

    const visibility = staticTag
      ? 'static '
      : protectedTag
      ? 'protected '
      : privateTag
      ? 'private '
      : '';

    let result = visibility + (readonlyTag ? 'readonly ' : '');
    result += name;
    if (optionalTag) result += '?';
    if (type) result += ': ' + type;
    if (defaultValue) result += ' = ' + defaultValue;
    result += ';';

    this.context.writer.writeLine(result);
  }
}

export class MethodComponent extends Component {
  render() {
    const staticTag = this.attr('static');
    const protectedTag = this.attr('protected');
    const privateTag = this.attr('private');
    const name = this.attr('name');
    const type = this.attr('type');

    if (staticTag + protectedTag + privateTag > 1) {
      throw new Error('Only one active visibility is allowed.');
    }

    const visibility = staticTag
      ? 'static '
      : protectedTag
      ? 'protected '
      : privateTag
      ? 'private '
      : '';

    let total = 0;
    for (const child of this.children) {
      if (child instanceof ParameterComponent) {
        total += child.getText().length;
      }
    }

    if (total > 50) {
      this.context.writer.writeLine(visibility + name + '(');
      this.context.writer.indent();
      this.content(ParameterComponent, '\n');
      this.context.writer.dedent();
      this.context.writer.writeLine(`)${type ? ': ' + type : ''} {`);
    } else {
      this.context.writer.write(visibility + name + '(');
      this.content(ParameterComponent);
      this.context.writer.write(`)${type ? ': ' + type : ''} {\n`);
    }

    this.context.writer.indent();
    this.content();
    this.context.writer.dedent();
    this.context.writer.writeLine('}');
  }
}

export class ParameterComponent extends Component {
  getText() {
    const staticTag = this.attr('static');
    const protectedTag = this.attr('protected');
    const privateTag = this.attr('private');
    const readonlyTag = this.attr('readonly');
    const optionalTag = this.attr('optional');
    const name = this.attr('name');
    const defaultValue = this.attr('default');
    const type = this.attr('type');

    if (staticTag + protectedTag + privateTag > 1) {
      throw new Error('Only one active visibility is allowed.');
    }

    const visibility = staticTag
      ? 'static '
      : protectedTag
      ? 'protected '
      : privateTag
      ? 'private '
      : '';

    let result = visibility + (readonlyTag ? 'readonly ' : '');
    result += name;
    if (optionalTag) result += '?';
    if (type) result += ': ' + type;
    if (defaultValue) result += ' = ' + defaultValue;
    result += ',';
    return result;
  }

  render() {
    this.context.writer.write(this.getText());
  }
}

export function register(context: Context) {
  context.component('interface', InterfaceComponent);
  context.component('interface-member', InterfaceMemberComponent);
  context.component('class', ClassComponent);
  context.component('property', PropertyComponent);
  context.component('method', MethodComponent);
  context.component('parameter', ParameterComponent);
}
