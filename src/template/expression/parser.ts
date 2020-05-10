import { Token, Tokenizer, TokenKind } from './tokenizer';
import { ByteCode, ByteCodeType } from './expression';

function parsePrimary(tokenizer: Tokenizer): ByteCode[] {
  let prev = tokenizer.prev();
  let token = tokenizer.peek();

  if (!token) {
    throw new Error('Unexpected expression termination.');
  }

  if (token.kind === TokenKind.Identifier) {
    if (prev && prev.kind === TokenKind.Pipe) {
      tokenizer.advance();
      return [{ type: ByteCodeType.Pipe, name: token.name }];
    } else if (prev && prev.kind === TokenKind.Dot) {
      tokenizer.advance();
      return [{ type: ByteCodeType.Literal, value: token.name }];
    } else {
      tokenizer.advance();
      return [{ type: ByteCodeType.ResolveName, name: token.name }];
    }
  }

  if (token.kind === TokenKind.OpenParenthesis) {
    tokenizer.advance();
    const result = parseExpression(tokenizer);
    const cp = tokenizer.peek();
    if (!cp || cp.kind !== TokenKind.CloseParenthesis) {
      throw new Error('Expected ) in the expression.');
    }
    tokenizer.advance();
    return result;
  }

  if (token.kind === TokenKind.Literal) {
    tokenizer.advance();
    return [{ type: ByteCodeType.Literal, value: token.value }];
  }

  throw new Error(`Unexpected token ${token.kind}`);
}

function parseExpression1(
  tokenizer: Tokenizer,
  lhs: ByteCode[],
  minPrecedence: number
): ByteCode[] {
  let lookahead = tokenizer.peek();
  while (lookahead && PRECEDENCE[lookahead.kind] > minPrecedence) {
    let op = lookahead;
    let opp = PRECEDENCE[op.kind];
    tokenizer.advance();
    let rhs = parsePrimary(tokenizer);
    lookahead = tokenizer.peek();
    while (
      lookahead &&
      (PRECEDENCE[lookahead.kind] > opp ||
        (PRECEDENCE[lookahead.kind] >= opp &&
          isLeftAssociative(lookahead.kind)))
    ) {
      rhs = parseExpression1(tokenizer, rhs, PRECEDENCE[lookahead.kind]);
      lookahead = tokenizer.peek();
    }

    switch (op.kind) {
      case TokenKind.Dot:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Get }];
        break;
      case TokenKind.And:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.And }];
        break;
      case TokenKind.Or:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Or }];
        break;
      case TokenKind.Pipe:
        lhs = [...lhs, ...rhs];
        break;
      case TokenKind.Add:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Add }];
        break;
      case TokenKind.Sub:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Sub }];
        break;
      case TokenKind.Div:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Div }];
        break;
      case TokenKind.Mul:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Mul }];
        break;
      case TokenKind.Eq:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Eq }];
        break;
      case TokenKind.Neq:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Neq }];
        break;
      case TokenKind.Lt:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Lt }];
        break;
      case TokenKind.Lte:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Lte }];
        break;
      case TokenKind.Gt:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Gt }];
        break;
      case TokenKind.Gte:
        lhs = [...lhs, ...rhs, { type: ByteCodeType.Gte }];
        break;
      default:
        throw new Error('Not implemented.');
    }
  }

  return lhs;
}

export function parseExpression(tokenizer: Tokenizer): ByteCode[] {
  return parseExpression1(tokenizer, parsePrimary(tokenizer), 0);
}

const PRECEDENCE: Record<TokenKind, number> = {
  [TokenKind.Identifier]: -1,
  [TokenKind.Literal]: -1,
  [TokenKind.OpenParenthesis]: -1,
  [TokenKind.CloseParenthesis]: -1,
  [TokenKind.Dot]: 20,
  [TokenKind.And]: 6,
  [TokenKind.Or]: 5,
  [TokenKind.Pipe]: 1,
  [TokenKind.Add]: 14,
  [TokenKind.Sub]: 14,
  [TokenKind.Div]: 15,
  [TokenKind.Mul]: 15,
  [TokenKind.Eq]: 11,
  [TokenKind.Neq]: 11,
  [TokenKind.Lt]: 12,
  [TokenKind.Lte]: 12,
  [TokenKind.Gt]: 12,
  [TokenKind.Gte]: 12,
};

function isLeftAssociative(kind: TokenKind): boolean {
  // Currently all of our operators are left-to-right!
  return PRECEDENCE[kind] > 0;
}
