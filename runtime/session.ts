import { Resolvable, createResolvable, stddev, mean } from './utils';
import { IBuilder } from './builder';
import { EnumCase, DeserializeFn, Struct } from './types';
import { IReader } from './reader';

interface PendingMessage {
  message: ArrayBuffer;
  replyPromise: Resolvable<void>;
}

export abstract class VossSessionBase<T extends EnumCase> {
  private websocket?: WebSocket;
  private timeOffset = 0;
  private timeSyncIntervalHandle: any;
  private isClockSyncInProgress = false;
  private pendingClockRequests: Resolvable<number>[] = [];
  private pendingMessages = new Map<number, PendingMessage>();
  private replyIdCounter = 0;
  private isClosed = false;
  private failedTry = 0;
  protected abstract deserializeMap: Record<number, DeserializeFn<Struct>>;

  constructor(readonly server: string) {
    this.onWSOpen = this.onWSOpen.bind(this);
    this.onWSMessage = this.onWSMessage.bind(this);
    this.onWSEnd = this.onWSEnd.bind(this);
    this.onOnline = this.onOnline.bind(this);
    this.startWS();
  }

  private startWS() {
    if (this.websocket || this.isClosed) return;

    if ('navigator' in window && 'onLine' in navigator) {
      if (!navigator.onLine) {
        window.addEventListener('online', this.onOnline);
        return;
      }
    }

    this.websocket = new WebSocket(this.server, 'VOSS');
    this.websocket.binaryType = 'arraybuffer';
    this.websocket.onopen = this.onWSOpen;
    this.websocket.onmessage = this.onWSMessage;
    this.websocket.onerror = this.onWSEnd;
    this.websocket.onclose = this.onWSEnd;
  }

  private onWSOpen() {
    this.failedTry = 0;

    try {
      this.syncClock();
    } catch (e) {
      console.error(e);
    }

    for (const { message } of this.pendingMessages.values()) {
      this.websocket!.send(message);
    }

    if (!this.timeSyncIntervalHandle) {
      this.timeSyncIntervalHandle = setInterval(() => {
        this.syncClock();
      }, 15e3);
    }
  }

  private onWSMessage(event: MessageEvent) {
    if (!(event.data instanceof ArrayBuffer)) {
      console.warn('(VOSS) Ignored incoming non-binary message.');
      return;
    }

    try {
      const buffer = event.data;
      const message = IReader.DeserializeEnum(buffer, this.deserializeMap);
      this.onMessage(message as any);
    } catch (e) {
      console.error('(VOSS) Failed to deserialize WebSocket message.');
      console.error(e);
    }
  }

  private onWSEnd() {
    if (!this.websocket) return;
    this.failedTry += 1;

    // Reject all the ongoing clock requests.
    for (const promise of this.pendingClockRequests)
      promise.reject(new Error(`Connected closed.`));
    this.pendingClockRequests = [];

    this.websocket = undefined;

    if ('navigator' in window && 'onLine' in navigator) {
      this.startWS();
    } else {
      if (this.failedTry === 0) {
        this.startWS();
      } else {
        setTimeout(() => {
          this.startWS();
        }, 500);
      }
    }
  }

  private onOnline() {
    this.startWS();
    window.removeEventListener('online', this.onOnline);
  }

  private async syncClock() {
    if (this.isClockSyncInProgress) return;
    this.isClockSyncInProgress = true;

    try {
      if (this.timeOffset === 0) {
        // Compute one initial clock offset.
        const offset = await this.requestClockOffset();
        this.timeOffset = offset;
      }

      // Start 7 requests together.
      const offsets: number[] = await Promise.all([
        this.requestClockOffset(),
        this.requestClockOffset(),
        this.requestClockOffset(),
        this.requestClockOffset(),
        this.requestClockOffset(),
        this.requestClockOffset(),
        this.requestClockOffset(),
      ]);

      // Sort the numbers to compute the `mid`.
      offsets.sort();

      const max = offsets[3] + stddev(offsets); // mid + stddev.
      const finalOffset = mean(offsets.filter((n) => n < max));
      this.timeOffset += finalOffset;

      const t = this.now();
      const o = this.timeOffset;
      console.info(`(VOSS) Server time: ${t} (offset: ${o}ms)`);
    } finally {
      this.isClockSyncInProgress = false;
    }
  }

  private async requestClockOffset(): Promise<number> {
    if (!this.websocket)
      throw new Error('WebSocket connection is not established yet.');
    const request = this.createClockRequest(this.now());
    const message = IBuilder.SerializeEnum(request).buffer;
    const promise = createResolvable<number>();
    this.pendingClockRequests.push(promise);

    const localStart = this.now();
    this.websocket.send(message);
    const serverTime = await promise;
    const latency = this.now() - localStart;
    return serverTime - (localStart + latency / 2);
  }

  now(): number {
    return Date.now() + this.timeOffset;
  }

  sendRequest(
    builder: (replyID: number, timestamp: number) => T
  ): Promise<void> {
    const replyId = this.replyIdCounter++;
    const replyPromise = createResolvable<void>();
    const timestamp = this.now();

    try {
      const request = builder(replyId, timestamp);
      const message = IBuilder.SerializeEnum(request).buffer;
      this.pendingMessages.set(replyId, { message, replyPromise });
      if (this.websocket) this.websocket.send(message);
    } catch (err) {
      this.pendingMessages.delete(replyId);
      throw err;
    }

    return replyPromise;
  }

  protected receivedTime(timestamp: number): void {
    const pendingClockRequest = this.pendingClockRequests.shift();
    if (!pendingClockRequest) {
      console.warn('(VOSS) Ignored unexpected clock message.');
      return;
    }
    pendingClockRequest.resolve(timestamp);
  }

  protected receivedReply(replyId: number): void {
    const pending = this.pendingMessages.get(replyId);
    if (!pending) {
      console.error(`(VOSS) Ignored Invalid Reply ID.`);
      return;
    }
    this.pendingMessages.delete(replyId);
    pending.replyPromise.resolve();
  }

  close() {
    this.isClosed = true;
    if (this.websocket) this.websocket.close();
    for (const { replyPromise } of this.pendingMessages.values())
      replyPromise.reject(`Session is closed.`);
    this.pendingMessages.clear();
  }

  protected abstract createClockRequest(timestamp: number): T;
  protected abstract onMessage(message: T): void;
}
