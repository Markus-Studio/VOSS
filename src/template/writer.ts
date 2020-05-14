export class Writer {
  private indentLevel = 0;
  private currentIndent = '';
  private buffer: string[] = [];
  private buffered?: string;

  constructor(private indention = '  ') {}

  indent(n = 1): void {
    this.indentLevel += n;
    this.currentIndent = this.indention.repeat(this.indentLevel);
  }

  dedent(n = 1): void {
    if (this.indentLevel - n < 0) {
      throw new Error('Writer indention underflow.');
    }
    this.indentLevel -= n;
    this.currentIndent = this.indention.repeat(this.indentLevel);
  }

  writeLine(line: string): void {
    if (this.buffered) {
      this.buffer.push(this.buffered);
      this.buffered = undefined;
    }

    const brace = line.trim() === '}';

    if (
      brace &&
      this.buffer.length &&
      this.buffer[this.buffer.length - 1] === ''
    )
      this.buffer.pop();

    this.buffer.push(this.currentIndent + line.trimRight());

    if (brace) this.buffer.push('');
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
      this.buffer.push(this.currentIndent + line.trimRight());
    }
  }

  data(): string {
    while (this.buffer[0] === '') this.buffer.shift();
    return (
      this.buffer
        .map((line) => line.trimRight())
        .filter((line, i) => {
          if (line === '') return !!this.buffer[i + 1];
          return true;
        })
        .join('\n') +
      (this.buffered || '') +
      '\n'
    );
  }
}
