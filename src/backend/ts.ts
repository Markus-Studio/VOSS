import { Program } from '../ir';
import { register } from '../template/collections/typescript';
import { Context } from '../template/context';

export function generate(program: Program) {
  const ctx = new Context();
  register(ctx);

  ctx.bind('objects', [...program.getObjects()]);
  ctx.run(`
  // VOSS AUTOGENERATED FILE, DO NOT MODIFY.
  import * as 

  XXX P
  `);

  console.log(ctx.writer.data());
}

generate(new Program());
