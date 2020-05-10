import { IRObject } from './object';
import { toPascalCase, toCamelCase, toSnakeCase } from '../utils';
import { IRObjectField } from './field';
import memorize from 'memorize-decorator';

// object Host {
//   @View(target, via) name;
// }
export class IRView {
  /**
   * The object that hosts this view.
   */
  private host?: IRObject;

  /**
   * The target object, view contains objects of this type.
   */
  readonly target: IRObject;

  constructor(
    /**
     * Name of the view.
     */
    readonly name: string,
    /**
     * The field on the target object that this view is connected to.
     */
    readonly via: IRObjectField
  ) {
    this.target = via.getOwner();
    if (!this.target.isRoot) {
      throw new Error('Views are only for root objects.');
    }
  }

  /**
   * Attach this view to an object known as the host object, which is the
   * object that contains this view inside of it.
   *
   * Throws if the view is already attached to another host.
   *
   * @param host Object that contains this view.
   */
  attach(host: IRObject): void {
    if (this.host) throw new Error('View is already attached to another host.');
    if (host.getView(this.name) !== this)
      throw new Error('Illegal view attach attempt.');
    this.host = host;
    this.via.addViewInternal(this);
  }

  /**
   * Return true if the view is attached to a host.
   */
  isAttached(): boolean {
    return !!this.host;
  }

  /**
   * Returns the host object, throws if the object is not attached to a
   * host yet.
   */
  getHost(): IRObject {
    if (!this.host) throw new Error('View is not attached yet.');
    return this.host;
  }

  /**
   * Name of this view in PascalCase.
   */
  @memorize()
  get pascalCase() {
    return toPascalCase(this.name);
  }

  /**
   * Name of this view in camelCase.
   */
  @memorize()
  get camelCase() {
    return toCamelCase(this.name);
  }

  /**
   * Name of this view in snake_case
   */
  @memorize()
  get snakeCase() {
    return toSnakeCase(this.name);
  }

  /**
   * Returns name of the RPC message case that requests members of this
   * view from the server.
   */
  rpcGetFetchCase() {
    return this.via.rpcGetFetchViewCase();
  }

  /**
   * Return the name of the message data object of FetchView request for
   * this view.
   */
  rpcGetFetchMsg() {
    return this.via.rpcGetFetchViewMsg();
  }
}
