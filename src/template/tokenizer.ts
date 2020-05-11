import { HTMLEntitySearch } from './HTMLEntitySearch';
import * as types from './types';

const enum States {
  DATA,
  CHARACTER_REFERENCE,
  TAG_OPEN,
  TAG_NAME,
  MARKUP_DECLARATION_OPEN,
  END_TAG_OPEN,
  BOGUS_COMMENT,
  SELF_CLOSING_START_TAG,
  BEFORE_ATTRIBUTE_NAME,
  ATTRIBUTE_NAME,
  AFTER_ATTRIBUTE_NAME,
  BEFORE_ATTRIBUTE_VALUE,
  ATTRIBUTE_VALUE_DOUBLE_QUOTED,
  ATTRIBUTE_VALUE_UNQUOTED,
  ATTRIBUTE_VALUE_SINGLE_QUOTED,
  CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE,
  AFTER_ATTRIBUTE_VALUE_QUOTED,
  COMMENT_START,
  COMMENT_START_DASH,
  COMMENT,
  COMMENT_END,
  COMMENT_END_DASH,
  COMMENT_END_BANG,
  ATTRIBUTE_VALUE_EXPRESSION,
  EXPRESSION,
}

const CharacterRefTable: Record<number, string> = {
  0x00: '\uFFFD',
  0x0d: '\u000D',
  0x80: '\u20AC',
  0x81: '\u0081',
  0x82: '\u201A',
  0x83: '\u0192',
  0x84: '\u201E',
  0x85: '\u2026',
  0x86: '\u2020',
  0x87: '\u2021',
  0x88: '\u02C6',
  0x89: '\u2030',
  0x8a: '\u0160',
  0x8b: '\u2039',
  0x8c: '\u0152',
  0x8d: '\u008D',
  0x8e: '\u017D',
  0x8f: '\u008F',
  0x90: '\u0090',
  0x91: '\u2018',
  0x92: '\u2019',
  0x93: '\u201C',
  0x94: '\u201D',
  0x95: '\u2022',
  0x96: '\u2013',
  0x97: '\u2014',
  0x98: '\u02DC',
  0x99: '\u2122',
  0x9a: 'U0161',
  0x9b: 'U203A',
  0x9c: 'U0153',
  0x9d: 'U009D',
  0x9e: 'U017E',
  0x9f: 'U0178',
};

const HTMLEntitySearchInstance = new HTMLEntitySearch();

export class Tokenizer {
  private state: States = States.DATA;
  private cursor = 0;
  private data!: string;
  private tokens: types.Token[] = [];
  private EOF = false;
  private CRefAdditionalAllowed?: string;
  private CRefComeBackState?: States;

  private currentTagToken?: types.OpenTagToken | types.EndTagToken;
  private currentOpenTagToken?: types.OpenTagToken;
  private currentAttributeName?: string;
  private currentAttributeValue?: string | types.ExpressionToken;
  private currentCommentData?: string;
  private expressionStart?: number;
  private readRawText = false;

  tokenize(data: string): types.Token[] {
    this.data = data;
    this.state = States.DATA;
    this.tokens = [];
    this.cursor = -1;
    this.EOF = false;
    while (!this.EOF) {
      this[this.state]();
    }
    return this.tokens;
  }

  private parseError(): void {
    throw new Error('Parse error');
  }

  private emitCharacterToken(character: string): void {
    // Prevent memory leak by not constructing an object for each character.
    const lastToken = this.tokens[this.tokens.length - 1];
    if (lastToken && lastToken.kind === types.TokenKind.Character) {
      lastToken.character += character;
      return;
    }
    this.tokens.push({
      kind: types.TokenKind.Character,
      character,
    });
  }

  private emitEOF(): void {
    this.EOF = true;
  }

  private emitTagToken(): void {
    if (this.currentAttributeName) {
      this.emitAttribute();
    }
    if (!this.currentTagToken) return;
    if (
      this.currentTagToken.name === 'script' ||
      this.currentTagToken.name === 'style'
    ) {
      if (this.currentTagToken.kind === types.TokenKind.OpenTag) {
        if (!this.currentTagToken.selfClosing) {
          this.readRawText = true;
        }
      } else {
        this.readRawText = false;
      }
    }
    this.tokens.push(this.currentTagToken);
    this.currentTagToken = this.currentOpenTagToken = undefined;
  }

  private emitAttribute(): void {
    if (!this.currentAttributeName) {
      return;
    }
    const name = this.currentAttributeName!;
    (this.currentOpenTagToken as any).attributes[
      name
    ] = this.currentAttributeValue;
    this.currentAttributeValue = undefined;
    this.currentAttributeName = undefined;
  }

  private emitCommentToken(data = this.currentCommentData) {
    // Do not emit comments, we don't need comments.
    // Maybe we can think of clean code generation later but
    // for now I just want this shit to work.
    return;
  }

  private getExpressionToken(): types.ExpressionToken {
    return {
      kind: types.TokenKind.Expression,
      expr: this.data.substring(this.expressionStart! + 1, this.cursor - 1),
    };
  }

  private emitExpression() {
    this.tokens.push(this.getExpressionToken());
  }

  private consumeNextInputCharacter(): string {
    return this.data[++this.cursor];
  }

  private unconsume(n = 1): void {
    this.cursor -= n;
  }

  private consume(n = 1): void {
    this.cursor += n;
  }

  private consumeCharacterReference(): string | void {
    const char = this.data[this.cursor + 1];
    const { CRefAdditionalAllowed: CRefAdditionalAllowed } = this;
    this.CRefAdditionalAllowed = undefined;
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
      case '\u003C':
      case '\u0026':
      case undefined:
      case CRefAdditionalAllowed:
        return;
      case '\u0023': // Number Sign (#)
        this.consume(); // Consume the number sign
        const tmp = this.data[this.cursor + 1];
        let range = /[0-9]/;
        let base = 10;
        if (tmp === 'x' || tmp === 'X') {
          this.consume(); // Consume X
          range = /[0-9a-fA-F]/;
          base = 16;
        }
        let characters = '';
        while (range.test(this.data[this.cursor + 1])) {
          characters += this.consumeNextInputCharacter();
        }
        if (!characters) {
          this.unconsume(2);
          this.parseError();
        }
        if (this.data[this.cursor + 1] === ';') {
          this.consume();
        } else {
          this.parseError();
        }
        const number = parseInt(characters, base);
        if (CharacterRefTable[number]) {
          this.parseError();
          return CharacterRefTable[number];
        }
        if ((0xd800 < number && number < 0xdfff) || number > 0x10ffff) {
          this.parseError();
          return '\uFFFD'; // REPLACEMENT CHARACTER
        }
        return String.fromCharCode(number);
    }
    return this.consumeNamedEntity();
  }

  private consumeNamedEntity() {
    HTMLEntitySearchInstance.reset();
    let consumed = 0;
    let char;
    while ((char = this.consumeNextInputCharacter())) {
      consumed++;
      if (!HTMLEntitySearchInstance.advance(char)) {
        break;
      }
      HTMLEntitySearchInstance.consume(char);
    }
    this.unconsume(consumed);
    if (HTMLEntitySearchInstance.mostRecent) {
      // entities.json provided by w3 prefixes everything with an
      // awkward "&", so -1.
      this.consume(HTMLEntitySearchInstance.mostRecent.length - 1);
      return HTMLEntitySearchInstance.getMostRecentUnicode();
    }
  }

  private [States.DATA]() {
    const char = this.consumeNextInputCharacter();
    if (this.readRawText && (char === '&' || char === '{')) {
      // TODO(qti3e) Support DTD;
      // Current situation is ugly :/
      this.emitCharacterToken(char);
      return;
    }

    if (char === '{' && this.data[this.cursor + 1] === '{') {
      this.state = States.EXPRESSION;
      this.consume();
      return;
    }

    switch (char) {
      case '&':
        this.state = States.CHARACTER_REFERENCE;
        break;
      case '<':
        this.state = States.TAG_OPEN;
        break;
      case '\x00':
        this.emitCharacterToken(char);
        break;
      case undefined:
        this.emitEOF();
        break;
      default:
        this.emitCharacterToken(char);
    }
  }

  private [States.CHARACTER_REFERENCE]() {
    const char = this.consumeCharacterReference();
    this.emitCharacterToken(char || '&');
    this.state = States.DATA;
  }

  private [States.TAG_OPEN]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '!':
        this.state = States.MARKUP_DECLARATION_OPEN;
        return;
      case '/':
        this.state = States.END_TAG_OPEN;
        return;
      case '?':
        this.state = States.BOGUS_COMMENT;
        return;
    }
    if (/[a-z]/i.test(char)) {
      this.currentTagToken = this.currentOpenTagToken = {
        kind: types.TokenKind.OpenTag,
        name: char,
        selfClosing: false,
        attributes: {},
        children: [],
      };
      this.state = States.TAG_NAME;
    } else {
      this.emitCharacterToken('<');
      this.unconsume();
      this.state = States.DATA;
    }
  }

  private [States.TAG_NAME]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        this.state = States.BEFORE_ATTRIBUTE_NAME;
        return;
      case '/':
        this.state = States.SELF_CLOSING_START_TAG;
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case undefined:
        this.unconsume();
        this.state = States.DATA;
        return;
      case '\u0000':
        this.currentTagToken!.name += '\uFFFD';
        return;
    }
    this.currentTagToken!.name += char;
  }

  private [States.BEFORE_ATTRIBUTE_NAME]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        // Ignore
        return;
      case '/':
        this.state = States.SELF_CLOSING_START_TAG;
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeName = '\uFFFD';
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
      case '"':
      case "'":
      case '<':
      case '=':
        this.parseError();
    }
    this.emitAttribute();
    this.currentAttributeName = char;
    this.currentAttributeValue = '';
    this.state = States.ATTRIBUTE_NAME;
  }

  private [States.SELF_CLOSING_START_TAG]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '>':
        this.currentOpenTagToken!.selfClosing = true;
        this.state = States.DATA;
        this.emitTagToken();
        break;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        break;
      default:
        this.parseError();
        this.state = States.BEFORE_ATTRIBUTE_NAME;
        this.unconsume();
    }
  }

  private [States.ATTRIBUTE_NAME]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        this.state = States.AFTER_ATTRIBUTE_NAME;
        return;
      case '/':
        this.state = States.SELF_CLOSING_START_TAG;
        return;
      case '=':
        this.state = States.BEFORE_ATTRIBUTE_VALUE;
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeName += '\uFFFD';
        return;
      case undefined:
        this.state = States.DATA;
        this.unconsume();
        return;
      case '"':
      case "'":
      case '<':
        this.parseError();
    }
    this.currentAttributeName += char;
  }

  private [States.AFTER_ATTRIBUTE_NAME]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        // Ignore.
        return;
      case '/':
        this.state = States.SELF_CLOSING_START_TAG;
        return;
      case '=':
        this.state = States.BEFORE_ATTRIBUTE_VALUE;
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case '\u0000':
        this.parseError();
        this.emitAttribute();
        this.currentAttributeName = '\uFFFD';
        this.currentAttributeValue = '';
        this.state = States.ATTRIBUTE_NAME;
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
      case '"':
      case "'":
      case '<':
        this.parseError();
    }
    this.emitAttribute();
    this.currentAttributeName = char;
    this.currentAttributeValue = '';
    this.state = States.ATTRIBUTE_NAME;
  }

  private [States.BEFORE_ATTRIBUTE_VALUE]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        // Ignore.
        return;
      case '{':
        this.state = States.ATTRIBUTE_VALUE_EXPRESSION;
        return;
      case '"':
        this.state = States.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        return;
      case '&':
        this.state = States.ATTRIBUTE_VALUE_UNQUOTED;
        this.unconsume();
        return;
      case "'":
        this.state = States.ATTRIBUTE_VALUE_SINGLE_QUOTED;
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeValue += '\uFFFD';
        this.state = States.ATTRIBUTE_VALUE_UNQUOTED;
        return;
      case '>':
        this.parseError();
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
      case '>':
      case '=':
      case '`':
        this.parseError();
    }
    this.currentAttributeValue += char;
    this.state = States.ATTRIBUTE_VALUE_UNQUOTED;
  }

  private [States.ATTRIBUTE_VALUE_DOUBLE_QUOTED]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '"':
        this.state = States.AFTER_ATTRIBUTE_VALUE_QUOTED;
        return;
      case '&':
        this.state = States.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
        this.CRefComeBackState = States.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
        this.CRefAdditionalAllowed = '"';
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeValue += '\uFFFD';
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
    }
    this.currentAttributeValue += char;
  }

  private [States.ATTRIBUTE_VALUE_SINGLE_QUOTED]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case "'":
        this.state = States.AFTER_ATTRIBUTE_VALUE_QUOTED;
        return;
      case '&':
        this.state = States.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
        this.CRefComeBackState = States.ATTRIBUTE_VALUE_SINGLE_QUOTED;
        this.CRefAdditionalAllowed = "'";
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeValue += '\uFFFD';
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
    }
    this.currentAttributeValue += char;
  }

  private [States.ATTRIBUTE_VALUE_UNQUOTED]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        this.state = States.BEFORE_ATTRIBUTE_NAME;
        return;
      case '&':
        this.state = States.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE;
        this.CRefComeBackState = States.ATTRIBUTE_VALUE_UNQUOTED;
        this.CRefAdditionalAllowed = '>';
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case '\u0000':
        this.parseError();
        this.currentAttributeValue += '\uFFFD';
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
      case '"':
      case "'":
      case '<':
      case '=':
      case '`':
        this.parseError();
    }
    this.currentAttributeValue += char;
  }

  private [States.AFTER_ATTRIBUTE_VALUE_QUOTED]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u0009':
      case '\u000A':
      case '\u000C':
      case '\u0020':
        this.state = States.BEFORE_ATTRIBUTE_NAME;
        return;
      case '/':
        this.state = States.SELF_CLOSING_START_TAG;
        return;
      case '>':
        this.state = States.DATA;
        this.emitTagToken();
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
        return;
    }
    this.parseError();
    this.unconsume();
    this.state = States.BEFORE_ATTRIBUTE_NAME;
  }

  private [States.CHARACTER_REFERENCE_IN_ATTRIBUTE_VALUE]() {
    const char = this.consumeCharacterReference() || '&';
    this.currentAttributeValue += char;
    this.state = this.CRefComeBackState!;
  }

  private [States.END_TAG_OPEN]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '>':
        this.parseError();
        this.state = States.DATA;
        return;
      case undefined:
        this.parseError();
        this.emitCharacterToken('<');
        this.emitCharacterToken('/');
        this.state = States.DATA;
        this.unconsume();
        return;
    }
    if (/[a-z]/i.test(char)) {
      this.currentTagToken = {
        kind: types.TokenKind.EndTag,
        name: char,
      };
      this.state = States.TAG_NAME;
    } else {
      this.parseError();
      this.state = States.BOGUS_COMMENT;
    }
  }

  private [States.BOGUS_COMMENT]() {
    let consumed = '';
    let char;
    while ((char = this.consumeNextInputCharacter())) {
      if (char === '>') {
        break;
      }
      if (char === '\u0000') {
        char = '\uFFFD';
      }
      consumed += char;
    }
    this.emitCommentToken(consumed);
    if (char === undefined) {
      this.unconsume();
    }
    this.state = States.DATA;
  }

  private [States.MARKUP_DECLARATION_OPEN]() {
    // Ok, this is where we have a really huge difference with HTML5 standard.
    // We're not going to support DOCTYPE and "[CDATA[" as they are not needed.
    // We just support HTML comments in this state.
    const chars =
      this.consumeNextInputCharacter() + this.consumeNextInputCharacter();
    if (chars === '--') {
      this.state = States.COMMENT_START;
      this.currentCommentData = '';
    } else {
      this.parseError();
    }
  }

  private [States.COMMENT_START]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u002D': // Hyphen-Minus
        this.state = States.COMMENT_START_DASH;
        return;
      case '\u0000':
        this.parseError();
        return;
      case '>':
        this.parseError();
        this.state = States.DATA;
        this.emitCommentToken();
        return;
      case undefined:
        this.parseError();
        this.state = States.DATA;
        this.unconsume();
    }
    this.currentCommentData += char;
  }

  private [States.COMMENT_START_DASH]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u002D': // Hyphen-Minus
        this.state = States.COMMENT_END;
        return;
      case '\u0000':
        this.parseError();
        this.currentCommentData += '\u002D\uFFFD';
        this.state = States.COMMENT;
        return;
      case '>':
        this.parseError();
        this.state = States.DATA;
        this.emitCommentToken();
        return;
      case undefined:
        this.parseError();
        this.emitCommentToken();
        this.unconsume();
        this.state = States.DATA;
        return;
    }
    this.currentCommentData += '\u002D' + char;
    this.state = States.COMMENT;
  }

  private [States.COMMENT]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u002D': // Hyphen-Minus
        this.state = States.COMMENT_END_DASH;
        return;
      case '\u0000':
        this.parseError();
        this.currentCommentData += '\uFFFD';
        return;
      case undefined:
        this.parseError();
        this.emitCommentToken();
        this.unconsume();
        this.state = States.DATA;
        return;
    }
    this.currentCommentData += char;
  }

  private [States.COMMENT_END_DASH]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u002D': // Hyphen-Minus
        this.state = States.COMMENT_END;
        return;
      case '\u0000':
        this.parseError();
        this.currentCommentData += '\u002D\uFFFD';
        this.state = States.COMMENT;
        return;
      case undefined:
        this.parseError();
        this.emitCommentToken();
        this.unconsume();
        this.state = States.DATA;
        return;
    }
    this.currentCommentData += '\u002D' + char;
    this.state = States.COMMENT;
  }

  private [States.COMMENT_END]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '>':
        this.state = States.DATA;
        this.emitCommentToken();
        return;
      case '\u0000':
        this.parseError();
        this.currentCommentData += '\u002D\uFFFD';
        this.state = States.COMMENT;
        return;
      case '!':
        this.parseError();
        this.state = States.COMMENT_END_BANG;
        return;
      case '\u002D':
        this.parseError();
        this.currentCommentData += '\u002D';
        return;
      case undefined:
        this.parseError();
        this.emitCommentToken();
        this.unconsume();
        this.state = States.DATA;
        return;
    }
    this.parseError();
    this.currentCommentData += '\u002D\u002D';
    this.state = States.COMMENT;
  }

  private [States.COMMENT_END_BANG]() {
    const char = this.consumeNextInputCharacter();
    switch (char) {
      case '\u002D':
        this.currentCommentData += '\u002D\u002D!';
        this.state = States.COMMENT_END_DASH;
        return;
      case '>':
        this.state = States.DATA;
        this.emitCommentToken();
        return;
      case '\u0000':
        this.parseError();
        this.currentCommentData += '\u002D\u002D!\uFFFD';
        this.state = States.COMMENT;
        return;
      case undefined:
        this.parseError();
        this.emitCommentToken();
        this.unconsume();
        this.state = States.DATA;
        return;
    }
    this.currentCommentData += '\u002D\u002D!';
    this.state = States.COMMENT;
  }

  private [States.ATTRIBUTE_VALUE_EXPRESSION]() {
    this.expressionStart = this.cursor;
    this.consumeJSExpr();
    this.currentAttributeValue = this.getExpressionToken();
    this.state = States.AFTER_ATTRIBUTE_VALUE_QUOTED;
  }

  private [States.EXPRESSION]() {
    this.expressionStart = this.cursor;
    this.consumeJSExpr();
    this.emitExpression();
    this.state = States.DATA;
  }

  private consumeJSExpr() {
    const char = this.consumeNextInputCharacter();

    if (char === '}' && this.data[this.cursor + 1] === '}') {
      this.consume();
      return;
    }

    switch (char) {
      case "'":
        this.JSConsumeQuoted("'");
        break;
      case '"':
        this.JSConsumeQuoted('"');
        break;
      case '(':
        this.JSConsumeEnding(')');
        break;
      case ')':
        this.cursor -= 1;
        return;
      case undefined:
        this.parseError();
        this.unconsume();
        this[States.DATA]();
        return;
    }

    this.consumeJSExpr();
  }

  private JSConsumeQuoted(q: string) {
    let char;
    let escaped = false;
    while ((char = this.consumeNextInputCharacter())) {
      if (char === '\\') {
        escaped = !escaped;
      }
      if (!escaped && char === q) {
        return;
      }
      if (char !== '\\') {
        escaped = false;
      }
    }
  }

  private JSConsumeEnding(b: string) {
    let char;
    while ((char = this.data[this.cursor + 1])) {
      if (char === b) {
        this.consume();
        return;
      }
      this.consumeJSExpr();
    }
  }
}
