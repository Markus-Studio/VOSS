export enum ViewStatus {
  Init,
  Loading,
  Loaded,
  Destroyed,
}

export interface ReadonlyView<T> {
  readonly status: ViewStatus;
  members(): ReadonlySet<T>;
}

export class View<T> implements ReadonlyView<T> {
  private _status: ViewStatus = ViewStatus.Init;
  private _members: Set<T> = new Set();

  constructor(private readonly callback: () => Promise<void>) {}

  get status(): ViewStatus {
    return this._status;
  }

  members(): ReadonlySet<T> {
    return this._members;
  }

  add(object: T) {
    this._members.add(object);
  }

  remove(object: T) {
    this._members.delete(object);
  }

  startedLoading() {
    this._status = ViewStatus.Loading;
  }

  finishedLoading() {
    this._status = ViewStatus.Loaded;
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
