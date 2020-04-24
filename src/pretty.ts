import { Writer } from './writer';

export class PrettyWriter implements Writer {
  private lines: string[] = [];
  private _indentLevel = 0;
  private indent = '';
  private leftOver?: string;

  private get indentLevel() {
    return this._indentLevel;
  }

  private set indentLevel(value: number) {
    if (value <= 0) {
      this.indent = '';
    } else {
      this.indent = '  '.repeat(value);
    }
  }

  private writeLine(line: string) {
    line = line.trim();
    if (line === '') {
      return;
    }

    for (let i = 0; i < line.length; ++i) {
      if (line[i] === '}') {
        this.indentLevel = this.indentLevel - 1;
      }
    }

    line = this.indent + line;
    this.lines.push(line);

    if (line === '}') {
      this.lines.push('');
    }

    for (let i = 0; i < line.length; ++i) {
      if (line[i] === '{') {
        this.indentLevel = this.indentLevel + 1;
      }
    }
  }

  write(chunk: string): void {
    if (this.leftOver) {
      chunk = this.leftOver + chunk;
      this.leftOver = undefined;
      return this.write(chunk);
    }

    const lines = chunk.split(/\r?\n/g);
    const lastPart = lines.pop();

    if (lastPart !== '') {
      this.leftOver = lastPart;
    }

    for (const line of lines) {
      this.writeLine(line);
    }
  }

  getSource(): string {
    if (this.leftOver) {
      this.writeLine(this.leftOver);
    }
    return this.lines.join('\n');
  }
}
