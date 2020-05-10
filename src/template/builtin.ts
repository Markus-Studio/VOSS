import { Component } from './component';

export class ContainerComponent extends Component {
  render() {
    this.content();
  }
}

export class TextComponent extends Component {
  render() {
    const value = this.attr('value') || '';
    this.context.writer.write(value);
  }
}

export class IndentComponent extends Component {
  render() {
    const value = this.attr('value') || 1;
    for (let i = 0; i < value; ++i) {
      this.context.writer.indent();
    }
  }
}

export class DedentComponent extends Component {
  render() {
    const value = this.attr('value') || 1;
    for (let i = 0; i < value; ++i) {
      this.context.writer.dedent();
    }
  }
}

export class ForComponent extends Component {
  render() {
    const iterator = this.attr('iter');
    const binding = this.attr('binding');
    if (!iterator) throw new Error('For: iter attribute is required.');

    for (const item of iterator) {
      this.context.table.push();
      if (binding) this.context.table.bind(binding, item);
      for (const child of this.children) {
        child.write(this.context);
      }
      this.context.table.pop();
    }
  }
}

export class IfComponent extends Component {
  render() {
    const condition = this.attr('condition');
    if (!condition) throw new Error('If: condition attribute is required.');
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
