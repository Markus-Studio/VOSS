import { ChangeNotifier } from './types';
import { IChangeNotifier } from './changeNotifier';

export enum ViewStatus {
  Init,
  Loading,
  Loaded,
  Destroyed,
}

export interface ReadonlyView<T> extends ChangeNotifier {
  readonly status: ViewStatus;
  members(): ReadonlySet<T>;
  load(): Promise<void>;
}

export class View<T> extends IChangeNotifier implements ReadonlyView<T> {
  private _status: ViewStatus = ViewStatus.Init;
  private _members: Set<T> = new Set();

  constructor(private readonly callback: () => Promise<void>) {
    super();
  }

  get status(): ViewStatus {
    return this._status;
  }

  members(): ReadonlySet<T> {
    return this._members;
  }

  add(object: T) {
    this._members.add(object);
    this.emitChange();
  }

  remove(object: T) {
    this._members.delete(object);
    this.emitChange();
  }

  startedLoading() {
    this._status = ViewStatus.Loading;
  }

  finishedLoading() {
    this._status = ViewStatus.Loaded;
    this.emitChange();
  }

  destroy() {
    this._status = ViewStatus.Destroyed;
  }

  async load() {
    if (
      this._status === ViewStatus.Loaded ||
      this._status === ViewStatus.Destroyed
    ) {
      return;
    }

    this._status = ViewStatus.Loading;
    try {
      await this.callback();
      this._status = ViewStatus.Loaded;
    } catch (e) {
      this._status = ViewStatus.Init;
      throw e;
    }
  }
}
