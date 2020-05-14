import { Struct, ChangeNotifier, Builder } from './types';
import { IChangeNotifier } from './changeNotifier';

export abstract class ObjectBase<T> extends IChangeNotifier
  implements Struct, ChangeNotifier {
  protected abstract readonly data: T;
  abstract serialize(builder: Builder): void;
  abstract equal(other: ObjectBase<T>): boolean;

  CAS<K extends keyof T>(key: K, current: T[K], next: T[K]): boolean {
    const local = this.data[key];

    // We're already in the desired state, we don't do anything.
    if (equal(local, next)) return true;

    if (!equal(local, current)) {
      return false;
    }

    this.data[key] = next;
    this.emitChange();
    return true;
  }
}

function equal(a: any, b: any): boolean {
  if (a === b) return true;

  if (a instanceof ObjectBase) {
    return a.equal(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return false;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    // Handle null.
    if (!a || !b) return false;

    if (typeof a.equal === 'function' && a.constructor === b.constructor) {
      return a.equal(b);
    }

    if (
      typeof a.type === 'number' &&
      typeof b.type === 'number' &&
      a.value &&
      b.value &&
      typeof a.value.equal === 'function' &&
      typeof a.value.constructor === b.value.constructor
    ) {
      return a.type === b.type && a.value.equal('function');
    }
  }

  return false;
}
