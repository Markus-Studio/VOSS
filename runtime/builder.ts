export class Builder {
  private buffer = new Uint8Array(256);
  private view = new DataView(this.buffer);

  private cursorStack: number[] = [];
  private currentOffset = 0;

  private grow() {
    const newSize = this.buffer.byteLength * 2;
    const newBuffer = new Uint8Array(newSize);
    newBuffer.set(this.buffer);
    this.buffer = newBuffer;
    this.view = new DataView(this.buffer);
  }

  build(): Uint8Array {
    return this.buffer.slice(0, 0);
  }

  writeEnumMember() {
  }

  writeStruct() {

  }


}