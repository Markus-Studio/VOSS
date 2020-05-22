import { Context } from './context';
import { Expression } from './expression/expression';
import { isIterable } from '../utils';

export type ComponentConstructor<T extends Component = Component> = {
  new (context: Context, attributes: Map<string, any>): T;
};

export abstract class Component {
  protected children: Set<Component> = new Set();
  protected currentChildren: Set<Component> = new Set();

  constructor(
    protected context: Context,
    private attributes: Map<string, any>
  ) {
    if (!context) throw new Error('Context is required.');
  }

  protected attr(name: string): any {
    const value = this.attributes.get(name);
    if (value instanceof Expression) {
      if (this.context) {
        return value.compute(this.context);
      } else {
        throw new Error('Cannot compute the expression.');
      }
    }
    return value;
  }

  protected list(name: string): string[] {
    const result: string[] = [];

    const base = this.attr(name);
    if (typeof base === 'string') {
      result.push(base);
    } else if (isIterable(base)) {
      for (const value of base) {
        if (typeof value === 'string') {
          result.push(value);
        }
      }
    }

    for (const key in this.attributes) {
      if (key.startsWith(name + '.')) {
        if (this.attr(key)) {
          result.push(key.slice(name.length + 1));
        }
      }
    }

    return result;
  }

  protected content<T extends Component>(
    constructor?: ComponentConstructor<T>,
    sep = ''
  ) {
    if (!this.context) {
      throw new Error('Content() requires an active context.');
    }

    this.context.table.push();
    for (const child of this.currentChildren) {
      if (constructor && !(child instanceof constructor)) {
        continue;
      }

      child.write();
      if (sep) this.context.writer.write(sep);
      this.currentChildren.delete(child);
    }
    this.context.table.pop();
  }

  push(child: Component) {
    this.children.add(child);
  }

  write(): void {
    this.currentChildren = new Set(this.children);
    this.render();
    this.currentChildren.clear();
  }

  protected abstract render(): void;
}
