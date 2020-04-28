export class PrettyWriter {
  private lines: string[] = [];
  private _indentLevel = 0;
  private currentIndent = '';
  private leftOver?: string;

  private get indentLevel() {
    return this._indentLevel;
  }

  private set indentLevel(value: number) {
    this._indentLevel = value;
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

    let indentOffset = 0;
    for (; indentOffset < line.length; ++indentOffset) {
      const char = line[indentOffset];
      if (char === '{') {
        break;
      } else if (char === '}') {
        this.dedent();
      }
    }

    const indentation = this.currentIndent;

    for (; indentOffset < line.length; ++indentOffset) {
      const char = line[indentOffset];
      if (char === '{') {
        this.indent();
      } else if (char === '}') {
        this.dedent();
      }
    }

    if (
      this.lines.length > 0 &&
      line.indexOf('{') > 0 &&
      line.indexOf('}') < 0 &&
      this.lines[this.lines.length - 1] !== '' &&
      !this.lines[this.lines.length - 1].endsWith('{')
    ) {
      this.lines.push('');
    }

    if (
      line === '}' &&
      this.lines.length > 0 &&
      this.lines[this.lines.length - 1] === ''
    ) {
      this.lines.pop();
    }

    const currentLine = indentation + line;
    this.lines.push(currentLine);

    if (
      this.lines.length > 1 &&
      line.endsWith('}') &&
      line.indexOf('{') < 0 &&
      !this.lines[this.lines.length - 2].endsWith('}')
    ) {
      this.lines.push('');
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
