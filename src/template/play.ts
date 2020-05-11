import { Context } from './context';
import { register } from './collections/typescript';

const context = new Context();
register(context);

context.bind('array', [0, 1, 2, 3]);

context.run(`
  Hello World

  <line *indent="1" *for="let _ in array" [value]="_ + 'XxX'" />

  {{ (2 + 3) * 5 }}

  class X {
    fn () {
    }
  }
`);

console.log(context.data());
