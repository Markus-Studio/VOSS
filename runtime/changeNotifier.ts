import { ChangeNotifier } from './types';

export class IChangeNotifier implements ChangeNotifier {
  private readonly listeners = new Set<() => void>();

  on(event: 'change', cb: () => void): void {
    if (event !== 'change') {
      return;
    }

    this.listeners.add(cb);
  }

  off(event: 'change', cb: () => void): void {
    if (event !== 'change') {
      return;
    }

    this.listeners.delete(cb);
  }

  emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
