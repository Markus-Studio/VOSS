import { Component } from '../component';
import { Context } from '../context';

export class ContainerComponent extends Component {
  render() {
    this.content();
  }
}

export class TextComponent extends Component {
  render() {
    const value = this.attr('value');
    this.context.writer.write(String(value));
  }
}

export class LineComponent extends Component {
  render() {
    const value = this.attr('value') || 1;
    this.context.writer.writeLine(String(value));
  }
}

export class IndentComponent extends Component {
  render() {
    const value = Number(this.attr('value')) || 1;
    this.context.writer.indent(value);
  }
}

export class DedentComponent extends Component {
  render() {
    const value = Number(this.attr('value')) || 1;
    this.context.writer.dedent(value);
  }
}

export class WithIndent extends Component {
  render() {
    const value = Number(this.attr('value')) || 1;
    this.context.writer.indent(value);
    this.content();
    this.context.writer.dedent(value);
  }
}

export class ForComponent extends Component {
  render() {
    const iterator = this.attr('iter');
    const binding = this.attr('bind');
    if (!iterator) {
      if (binding)
        throw new Error(
          `Cannot bind to ${binding}, iter attribute is not provided.`
        );
      throw new Error('For: iter attribute is required.');
    }

    for (const item of iterator) {
      this.context.table.push();
      if (binding) this.context.table.bind(binding, item);
      for (const child of this.children) {
        child.write();
      }
      this.context.table.pop();
    }
  }
}

export class IfComponent extends Component {
  render() {
    const condition = this.attr('condition');
    if (condition) {
      this.content();
    }
  }
}

export class BindComponent extends Component {
  render() {
    const name = this.attr('name');
    const value = this.attr('value');
    this.context.bind(name, value);
  }
}

export class TemplateComponent extends Component {
  constructor(context: Context, attributes: Map<string, any>) {
    super(context, attributes);
    const org = this;
    context.component(
      attributes.get('name'),
      class CustomComponent extends Component {
        render() {
          for (const child of org.getChildren()) child.write();
          this.content();
        }
      }
    );
  }

  getChildren() {
    return this.children;
  }

  render() {}
}

export class RenderComponent extends Component {
  render() {
    const constructor = this.context.resolveComponent(this.attr('template'));
    const component = new constructor(this.context, new Map());
    component.write();
  }
}
