export const enum TokenKind {
  Identifier = 'Identifier',
  Literal = 'Literal',
  OpenParenthesis = '(',
  CloseParenthesis = ')',
  Dot = '.',
  And = '&&',
  Or = '||',
  Pipe = '|',
  Add = '+',
  Sub = '-',
  Div = '/',
  Mul = '*',
  Eq = '==',
  Neq = '!=',
  Lt = '<',
  Lte = '<=',
  Gt = '>',
  Gte = '>=',
}

export interface IdentifierToken {
  kind: TokenKind.Identifier;
  name: string;
}

export interface LiteralToken {
  kind: TokenKind.Literal;
  value: any;
}

export interface PunctuationToken {
  kind:
    | TokenKind.OpenParenthesis
    | TokenKind.CloseParenthesis
    | TokenKind.Dot
    | TokenKind.And
    | TokenKind.Or
    | TokenKind.Pipe
    | TokenKind.Add
    | TokenKind.Sub
    | TokenKind.Div
    | TokenKind.Mul
    | TokenKind.Eq
    | TokenKind.Neq
    | TokenKind.Lt
    | TokenKind.Lte
    | TokenKind.Gt
    | TokenKind.Gte;
}

export type Token = IdentifierToken | LiteralToken | PunctuationToken;

export function* tokenize(expr: string): IterableIterator<Token> {
  for (let cursor = 0; cursor < expr.length; ) {
    const char = expr[cursor];

    if (char.trim() === '') {
      cursor += 1;
      continue;
    }

    if (char === '(') {
      cursor += 1;
      yield { kind: TokenKind.OpenParenthesis };
      continue;
    }

    if (char === ')') {
      cursor += 1;
      yield { kind: TokenKind.CloseParenthesis };
      continue;
    }

    if (char === '.') {
      cursor += 1;
      yield { kind: TokenKind.Dot };
      continue;
    }

    if (char === '&' && expr[cursor + 1] === '&') {
      cursor += 2;
      yield { kind: TokenKind.And };
      continue;
    }

    if (char === '|' && expr[cursor + 1] === '|') {
      cursor += 2;
      yield { kind: TokenKind.Or };
      continue;
    }

    if (char === '|') {
      cursor += 1;
      yield { kind: TokenKind.Pipe };
      continue;
    }

    if (char === '+') {
      cursor += 1;
      yield { kind: TokenKind.Add };
      continue;
    }

    if (char === '-') {
      cursor += 1;
      yield { kind: TokenKind.Sub };
      continue;
    }

    if (char === '/') {
      cursor += 1;
      yield { kind: TokenKind.Div };
      continue;
    }

    if (char === '*') {
      cursor += 1;
      yield { kind: TokenKind.Mul };
      continue;
    }

    if (char === '=' && expr[cursor + 1] === '=') {
      cursor += 2;
      yield { kind: TokenKind.Eq };
      continue;
    }

    if (char === '!' && expr[cursor + 1] === '=') {
      cursor += 2;
      yield { kind: TokenKind.Neq };
      continue;
    }

    if (char === '<') {
      cursor += 1;
      yield { kind: TokenKind.Lt };
      continue;
    }

    if (char === '<' && expr[cursor + 1] === '=') {
      cursor += 2;
      yield { kind: TokenKind.Lte };
      continue;
    }

    if (char === '>') {
      cursor += 1;
      yield { kind: TokenKind.Gt };
      continue;
    }

    if (char === '>' && expr[cursor + 1] === '=') {
      cursor += 2;
      yield { kind: TokenKind.Gte };
      continue;
    }

    if (/[0-9]/.test(char)) {
      let float = false;
      let result = char;
      cursor += 1;

      while (
        cursor < expr.length &&
        (/[0-9]/.test(expr[cursor]) || (!float && expr[cursor] === '.'))
      ) {
        result += expr[cursor];
        if (expr[cursor] === '.') float = true;
        cursor += 1;
      }

      const value = float ? parseFloat(result) : parseInt(result);
      yield { kind: TokenKind.Literal, value };
      continue;
    }

    if (char === '"' || char === "'") {
      cursor += 1;
      const ending = char;
      let escaped = false;
      let finished = false;
      let result = '';

      let c: string;
      while (cursor < expr.length) {
        c = expr[cursor];

        if (c === '\\') {
          escaped = !escaped;
          cursor += 1;

          if (!escaped) {
            result += '\\';
          }

          continue;
        }

        if (escaped) {
          switch (c) {
            case ending:
              result += ending;
              break;
            case 't':
              result += '\t';
            case 'n':
              result += '\n';
            case 'r':
              result += '\r';
            default:
              result += c;
          }
        } else if (c === ending) {
          finished = true;
          cursor += 1;
          break;
        } else {
          result += c;
        }

        if (c !== '\\') {
          escaped = false;
          cursor += 1;
          continue;
        }

        cursor += 1;
      }

      if (!finished)
        throw new Error('Unterminated string literal in expression.');

      yield { kind: TokenKind.Literal, value: result };
      continue;
    }

    if (/[a-z_]/i.test(char)) {
      let result = char;
      cursor += 1;

      while (cursor < expr.length && /[a-z_0-9]/i.test(expr[cursor])) {
        result += expr[cursor];
        cursor += 1;
      }

      if (result === 'true') {
        yield { kind: TokenKind.Literal, value: true };
      } else if (result === 'false') {
        yield { kind: TokenKind.Literal, value: false };
      } else {
        yield { kind: TokenKind.Identifier, name: result };
      }

      continue;
    }

    throw new Error(`Unexpected character ${char} found in expression.`);
  }
}

export class Tokenizer {
  private iterator?: IterableIterator<Token>;
  private current?: Token;
  private last?: Token;
  private done: boolean = false;

  tokenize(source: string) {
    this.done = false;
    this.iterator = tokenize(source);
    this.current = undefined;
    this.advance();
  }

  prev(): Token | undefined {
    return this.last;
  }

  peek(): Token | undefined {
    return this.current;
  }

  advance(): void {
    if (this.done) return;
    this.last = this.current;
    const { value, done } = this.iterator!.next();
    if (done) {
      this.done = true;
      this.current = undefined;
    } else {
      this.current = value;
    }
  }
}
