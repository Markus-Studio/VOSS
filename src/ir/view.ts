import { IRObject, IRObjectField } from './object';

// object Host {
//   @View(target, via) name;
// }
export class IRView {
  private host?: IRObject;
  readonly target: IRObject;

  constructor(readonly name: string, readonly via: IRObjectField) {
    this.target = via.getOwner();
    if (!this.target.isRoot) {
      throw new Error('Views are only for root objects.');
    }
  }

  attach(host: IRObject): void {
    if (this.host) throw new Error('View is already attached to another host.');
    if (host.getView(this.name) !== this)
      throw new Error('Illegal view attach attempt.');
    this.host = host;
    this.via.addViewInternal(this);
  }

  isAttached(): boolean {
    return !!this.host;
  }

  getHost(): IRObject {
    if (!this.host) throw new Error('View is not attached yet.');
    return this.host;
  }
}
