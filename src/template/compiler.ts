import * as types from './types';
import { Component } from './component';
import {
  ContainerComponent,
  TextComponent,
  ForComponent,
  WithIndent,
  IfComponent,
} from './collections/builtin';
import { Tokenizer } from './tokenizer';
import { constructTree } from './tree';
import { Context } from './context';
import { Expression } from './expression/expression';
import { removeCommonIndent } from './utils';

export function compile(context: Context, template: string): Component {
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(template);
  const tree = constructTree(tokens);

  if (tree.length === 1) {
    return toComponent(context, tree[0]);
  }

  const container = new ContainerComponent(context, new Map());

  for (const node of tree) {
    if (
      node.kind === types.TokenKind.Character &&
      node.character.trim() === ''
    ) {
      continue;
    }
    container.push(toComponent(context, node));
  }

  return container;
}

function toComponent(context: Context, node: types.Node): Component {
  if (node.kind === types.TokenKind.Character) {
    let text = node.character.replace(/  +$/, '');
    text = text.replace(/^(\r?\n)+/, '');
    text = removeCommonIndent(text.split(/\r?\n/g)).join('\n');
    return new TextComponent(context, new Map([['value', text]]));
  }

  if (node.kind === types.TokenKind.Expression) {
    return new TextComponent(
      context,
      new Map([['value', Expression.fromSource(node.expr)]])
    );
  }

  const constructor = context.resolveComponent(node.name);

  const entries = Object.entries(node.attributes);
  const inOrder: ('*for' | '*if')[] = [];

  const attributes = new Map(
    entries
      .filter(([key, value]) => {
        if (key.startsWith('*')) {
          if (key === '*for') {
            inOrder.push('*for');
            return false;
          } else if (key === '*if') {
            inOrder.push('*if');
            return false;
          } else if (key === '*indent') {
            return false;
          }
          throw new Error(`Invalid attribute ${key}`);
        }
        return true;
      })
      .map(([key, value]) => {
        if (key.startsWith('[') && key.endsWith(']')) {
          return [key.slice(1, -1), Expression.fromSource(value)];
        }

        if (value === '') {
          return [key, true];
        }

        return [key, value];
      })
  );

  let component = new constructor(context, attributes);

  for (const child of node.children) {
    if (
      child.kind === types.TokenKind.Character &&
      child.character.trim() === ''
    ) {
      continue;
    }
    component.push(toComponent(context, child));
  }

  for (const x of inOrder.reverse()) {
    switch (x) {
      case '*for':
        component = wrapFor(context, component, node.attributes['*for']);
        break;
      case '*if':
        component = wrapIf(context, component, node.attributes['*if']);
        break;
    }
  }

  if (node.attributes['*indent']) {
    component = wrapIndent(context, component, node.attributes['*indent']);
  }

  return component;
}

function wrapFor(
  context: Context,
  component: Component,
  expr: string
): Component {
  const result = expr.trim().match(/^let ([a-z_][a-z_0-9]*) in (.+)/i);

  if (!result) {
    throw new Error(`'${expr}' is not a valid value for *for`);
  }

  const bind = result[1];
  const iter = Expression.fromSource(result[2]);

  const wrapper = new ForComponent(
    context,
    new Map([
      ['iter', iter],
      ['bind', bind],
    ])
  );

  wrapper.push(component);

  return wrapper;
}

function wrapIf(
  context: Context,
  component: Component,
  expr: string
): Component {
  const condition = Expression.fromSource(expr);

  const wrapper = new IfComponent(context, new Map([['condition', condition]]));
  wrapper.push(component);
  return wrapper;
}

function wrapIndent(
  context: Context,
  component: Component,
  value: string
): Component {
  const wrapper = new WithIndent(context, new Map([['value', Number(value)]]));
  wrapper.push(component);
  return wrapper;
}
