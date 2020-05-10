export class Writer {
  private indentLevel = 0;
  private currentIndent = '';
  private buffer: string[] = [];
  private buffered?: string;

  constructor(private indention = '  ') {}

  indent(): void {
    this.indentLevel += 1;
    this.currentIndent += this.indention.repeat(this.indentLevel);
  }

  dedent(): void {
    if (this.indentLevel === 0) {
      throw new Error('Writer indention underflow.');
    }
    this.indentLevel -= 1;
    this.currentIndent += this.indention.repeat(this.indentLevel);
  }

  writeLine(line: string): void {
    if (this.buffered) {
      this.buffer.push(this.buffered);
      this.buffered = undefined;
    }

    this.buffer.push(this.currentIndent + line.trimRight());
  }

  write(chunk: string): void {
    if (this.buffered !== undefined) {
      chunk = this.buffered + chunk;
      this.buffered = undefined;
      return this.write(chunk);
    }

    const lines = chunk.split(/\r?\n/g);

    const lastChunk = lines.pop();
    if (lastChunk !== '') {
      this.buffered = lastChunk;
    }

    for (const line of lines) {
      this.buffer.push(this.currentIndent + line);
    }
  }

  data(): string {
    return this.buffer.join('\n') + (this.buffered || '') + '\n';
  }
}
