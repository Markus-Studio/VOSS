import { Context } from './context';
import { Expression } from './expression/expression';

export type ComponentConstructor<T extends Component = Component> = {
  new (attributes: Map<string, any>): T;
};

export abstract class Component {
  protected context!: Context;
  protected children: Set<Component> = new Set();
  protected currentChildren: Set<Component> = new Set();

  constructor(private attributes: Map<string, any>) {}

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

  protected content<T extends Component>(
    constructor?: ComponentConstructor<T>
  ) {
    if (!this.context) {
      throw new Error('Content() requires an active context.');
    }

    for (const child of this.currentChildren) {
      if (constructor && !(child instanceof constructor)) {
        continue;
      }

      child.write(this.context);
      this.currentChildren.delete(child);
    }
  }

  push(child: Component) {
    this.children.add(child);
  }

  write(ctx: Context): void {
    this.context = ctx;
    this.currentChildren = new Set(this.children);
    this.render();
    this.currentChildren.clear();
    this.context = undefined as any;
  }

  protected abstract render(): void;
}
