export function isIdentifier(name: string) {
  const IDENTIFIER_REGEXP = /^[a-z_][a-z_0-9]*$/gi;
  return IDENTIFIER_REGEXP.test(name);
}

export function getCommonIndent(lines: string[]): string {
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

export function removeCommonIndent(lines: string[]): string[] {
  if (lines.length === 0) return [];
  const indentLength = getCommonIndent(lines.filter((line) => !!line)).length;
  return lines.map((line) => line.slice(indentLength));
}
