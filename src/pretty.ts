import { Writer } from './writer';

export class PrettyWriter implements Writer {
  private lines: string[] = [];
  private _indentLevel = 0;
  private currentIndent = '';
  private leftOver?: string;

  private get indentLevel() {
    return this._indentLevel;
  }

  private set indentLevel(value: number) {
    if (value <= 0) {
      this.currentIndent = '';
    } else {
      this.currentIndent = '  '.repeat(value);
    }
  }

  private writeLine(line: string) {
    line = line.trim();
    if (line === '') {
      return;
    }

    if (
      this.lines.length > 0 &&
      line.endsWith('{') &&
      this.lines[this.lines.length - 1] !== ''
    ) {
      this.lines.push('');
    }

    if (line.startsWith('}')) {
      for (let i = 0; i < line.length; ++i) {
        if (line[i] !== '}') {
          break;
        }
        this.indentLevel -= 1;
      }
    }

    line = this.currentIndent + line;
    this.lines.push(line);

    if (line.endsWith('}')) {
      this.lines.push('');
    }

    for (let i = 0; i < line.length; ++i) {
      if (line[i] === '{') {
        this.indentLevel = this.indentLevel + 1;
      }
      if (line[i] === '}') {
        this.indentLevel = this.indentLevel - 1;
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

  indent() {
    this.indentLevel += 1;
  }

  dedent() {
    this.indentLevel -= 1;
  }

  getSource(): string {
    if (this.leftOver) {
      this.writeLine(this.leftOver);
    }
    return this.lines.join('\n');
  }
}
