import { Struct, ChangeNotifier, Builder } from './types';
import { IChangeNotifier } from './changeNotifier';
import { VossSessionBase } from './session';

export abstract class ObjectBase<T, S extends VossSessionBase<any>>
  extends IChangeNotifier
  implements Struct, ChangeNotifier {
  protected abstract readonly data: T;
  abstract serialize(builder: Builder): void;
  abstract equal(other: ObjectBase<T, S>): boolean;
  abstract updated<K extends keyof T>(
    session: S,
    key: K,
    prev: T[K],
    current: T[K]
  ): void;

  CAS<K extends keyof T>(session: S, key: K, prev: T[K], next: T[K]): boolean {
    const current = this.data[key];

    // We're already in the desired state, we don't do anything.
    if (equal(current, next)) return true;

    if (!equal(current, prev)) {
      return false;
    }

    this.data[key] = next;
    this.updated(session, key, prev, next);
    this.emitChange();
    return true;
  }
}

function equal(a: any, b: any): boolean {
  if (a === b) return true;

  if (a instanceof ObjectBase) {
    // prettier-ignore
    return (b instanceof ObjectBase) && (a.constructor === b.constructor) && a.equal(b);
  }

  if (Number.isNaN(a) && Number.isNaN(b)) {
    return true;
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
      return a.type === b.type && a.value.equal(b.value);
    }
  }

  return false;
}
