import { Context } from '../context';
import { parseExpression } from './parser';
import { Tokenizer } from './tokenizer';

export const enum ByteCodeType {
  ResolveName,
  Literal,
  Pipe,
  Get,
  And,
  Or,
  Add,
  Sub,
  Div,
  Mul,
  Eq,
  Neq,
  Lt,
  Lte,
  Gt,
  Gte,
}

export type ByteCode =
  | { type: ByteCodeType.ResolveName; name: string }
  | { type: ByteCodeType.Literal; value: any }
  | { type: ByteCodeType.Pipe; name: string }
  | { type: ByteCodeType.Get }
  | { type: ByteCodeType.And }
  | { type: ByteCodeType.Or }
  | { type: ByteCodeType.Add }
  | { type: ByteCodeType.Sub }
  | { type: ByteCodeType.Div }
  | { type: ByteCodeType.Mul }
  | { type: ByteCodeType.Eq }
  | { type: ByteCodeType.Neq }
  | { type: ByteCodeType.Lt }
  | { type: ByteCodeType.Lte }
  | { type: ByteCodeType.Gt }
  | { type: ByteCodeType.Gte };

export class Expression {
  private stack: any[] = [];

  constructor(private instructions: ByteCode[]) {}

  static fromSource(source: string) {
    const tokenizer = new Tokenizer();
    tokenizer.tokenize(source.trim());
    const instructions = parseExpression(tokenizer);
    if (
      instructions.length === 1 &&
      instructions[0].type === ByteCodeType.Literal
    ) {
      return instructions[0].value;
    }
    return new Expression(instructions);
  }

  private push(value: any) {
    this.stack.push(value);
  }

  private pop(): any {
    if (this.stack.length === 0) throw new Error('Run out of stack.');
    return this.stack.pop();
  }

  compute(context: Context) {
    this.stack = [];

    let tmp: any;

    for (const bc of this.instructions) {
      switch (bc.type) {
        case ByteCodeType.ResolveName:
          this.push(context.resolve(bc.name));
          break;
        case ByteCodeType.Literal:
          this.push(bc.value);
          break;
        case ByteCodeType.Pipe:
          this.push(context.resolvePipe(bc.name)(this.pop()));
          break;
        case ByteCodeType.Get:
          let key = this.pop();
          this.push(this.pop()[key]);
          break;
        case ByteCodeType.And:
          tmp = this.pop();
          this.push(this.pop() && tmp);
          break;
        case ByteCodeType.Or:
          tmp = this.pop();
          this.push(this.pop() || tmp);
          break;
        case ByteCodeType.Add:
          tmp = this.pop();
          this.push(this.pop() + tmp);
          break;
        case ByteCodeType.Sub:
          tmp = this.pop();
          this.push(this.pop() - tmp);
          break;
        case ByteCodeType.Div:
          tmp = this.pop();
          this.push(this.pop() / tmp);
          break;
        case ByteCodeType.Mul:
          tmp = this.pop();
          this.push(this.pop() * tmp);
          break;
        case ByteCodeType.Eq:
          this.push(this.pop() === this.pop());
          break;
        case ByteCodeType.Neq:
          this.push(this.pop() !== this.pop());
          break;
        case ByteCodeType.Lt:
          this.push(this.pop() > this.pop());
          break;
        case ByteCodeType.Lte:
          this.push(this.pop() >= this.pop());
          break;
        case ByteCodeType.Gt:
          this.push(this.pop() < this.pop());
          break;
        case ByteCodeType.Gte:
          this.push(this.pop() >= this.pop());
          break;
      }
    }

    const value = this.pop();
    this.stack = [];
    if (this.stack.length !== 0) throw new Error('Computation error.');

    return value;
  }
}
