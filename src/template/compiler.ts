import * as types from './types';
import { Component } from './component';
import { ContainerComponent, TextComponent } from './builtin';
import { Tokenizer } from './tokenizer';
import { constructTree } from './tree';
import { Context } from './context';
import { Expression } from './expression/expression';

export function compile(context: Context, template: string): Component {
  const tokenizer = new Tokenizer();
  const tokens = tokenizer.tokenize(template);
  const tree = constructTree(tokens);

  if (tree.length === 1) {
    return toComponent(context, tree[0]);
  }

  const container = new ContainerComponent(new Map());

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
    return new TextComponent(
      new Map([['value', node.character.replace(/ +$/, '')]])
    );
  }

  if (node.kind === types.TokenKind.Expression) {
    return new TextComponent(
      new Map([['value', Expression.fromSource(node.expr)]])
    );
  }

  const constructor = context.resolveComponent(node.name);

  const attributes = new Map(
    Object.entries(node.attributes).map(([key, value]) => {
      if (key.startsWith('[') && key.endsWith(']')) {
        return [key.slice(1, -1), Expression.fromSource(value)];
      }

      if (value === '') {
        return [key, true];
      }

      return [key, value];
    })
  );

  const component = new constructor(attributes);

  for (const child of node.children) {
    if (
      child.kind === types.TokenKind.Character &&
      child.character.trim() === ''
    ) {
      continue;
    }
    component.push(toComponent(context, child));
  }

  return component;
}
