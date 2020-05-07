export class PrettyWriter {
  private lines: string[] = [];
  private indentLevel = 0;
  private currentIndent = '';
  private leftover?: string;
  private stack: ('[' | '(' | '{')[] = [];

  private push(ch: '{' | '[' | '(') {
    this.stack.push(ch);
  }

  private pop(ch: '{' | '[' | '('): boolean {
    const x = this.stack.pop();
    if (x === ch) {
      return true;
    } else if (x) {
      this.stack.push(x);
    }
    return false;
  }

  private writeLine(line: string) {
    line = line.trim();
    const prevLine =
      this.lines.length === 0 ? '' : this.lines[this.lines.length - 1];
    const isPrevLineBlank = prevLine === '';

    if (line === '') {
      if (!isPrevLineBlank) this.lines.push('');
      return;
    }

    if (
      !isPrevLineBlank &&
      line.endsWith('{') &&
      !line.startsWith('}') &&
      !line.startsWith(')') &&
      !line.startsWith(']') &&
      !prevLine.endsWith('{') &&
      !prevLine.endsWith(']')
    ) {
      this.lines.push('');
    } else if (
      !isPrevLineBlank &&
      line.endsWith(']') &&
      !prevLine.endsWith(']') &&
      !prevLine.endsWith('{')
    ) {
      this.lines.push('');
    }

    let popped = false;
    let lastIndentionIndex = 0;
    const pop = (char: '(' | '{' | '[') => {
      if (!this.pop(char)) {
        return;
      }
      popped = true;
    };

    for (const char of line) {
      let br = false;
      switch (char) {
        case '}':
          pop('{');
          break;
        case ')':
          pop('(');
          break;
        case ']':
          pop('[');
          break;
        default:
          br = true;
      }
      if (br) break;
      lastIndentionIndex += 1;
    }

    if (popped) this.dedent();

    let indent = this.currentIndent;
    if (prevLine.endsWith('&&') || prevLine.endsWith('||')) indent += '  ';
    const currentLine = indent + line;
    this.lines.push(currentLine);

    let pushed = 0;

    for (let i = lastIndentionIndex; i < line.length; ++i) {
      const char = line[i];
      switch (char) {
        case '{':
        case '(':
        case '[':
          this.push(char);
          pushed += 1;
          break;
        case '}':
          if (this.pop('{')) pushed -= 1;
          break;
        case ')':
          if (this.pop('(')) pushed -= 1;
          break;
        case ']':
          if (this.pop('[')) pushed -= 1;
          break;
      }
    }

    if (pushed > 0) {
      this.indent();
    }

    if (pushed < 0) {
      this.dedent();
    }
  }

  write(chunk: string): void {
    if (this.leftover) {
      chunk = this.leftover + chunk;
      this.leftover = undefined;
      return this.write(chunk);
    }

    let lines = chunk.split(/\r?\n/g);
    const lastPart = lines.pop();

    if (lastPart !== '') this.leftover = lastPart;

    // lines = removeCommonIndent(lines);

    for (const line of lines) {
      this.writeLine(line);
    }
  }

  indent() {
    this.indentLevel += 1;
    this.currentIndent = '  '.repeat(this.indentLevel);
  }

  dedent() {
    this.indentLevel -= 1;
    this.currentIndent = '  '.repeat(this.indentLevel);
  }

  getSource(): string {
    if (this.leftover) {
      this.writeLine(this.leftover);
    }
    return this.lines.join('\n');
  }
}

function getCommonIndent(lines: string[]): string {
  if (lines.length === 0) return '';

  let result = '';

  const minLength = Math.min(...lines.map((line) => line.length));

  for (let i = 0; minLength; ++i) {
    let ch = lines[0][i];

    if (ch !== ' ' && ch !== '\t') {
      return result;
    }

    for (const line of lines) {
      if (line[i] !== ch) {
        return result;
      }
    }

    result += ch;
  }

  return result;
}

function removeCommonIndent(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const indentLength = getCommonIndent(lines).length;
  return lines.map((line) => line.slice(indentLength));
}
