import { Context } from './context';

console.log('started');

const context = new Context();

context.bind('array', [0, 1, 2, 3]);

context.run(`
  Hello World

  <for [iter]="array">
    {{ 'Hello\n' }}
  </for>
`);

console.log(context.data());
