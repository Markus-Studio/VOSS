import * as types from './types';

// HTML tree construction.
// Maybe it's not implemented as it should be,
// but it works :)

function parseError() {
  throw new Error('Parse error');
}

export function constructTree(tokens: types.Token[]): types.Node[] {
  const nodes: types.Node[] = [];
  const openTagStack: types.OpenTagToken[] = [];

  for (const token of tokens) {
    let parent: types.OpenTagToken;
    switch (token.kind) {
      case types.TokenKind.OpenTag:
        if (token.selfClosing) {
          parent = openTagStack.pop()!;
          if (parent) {
            parent.children.push(token);
            openTagStack.push(parent);
          } else {
            nodes.push(token);
          }
        } else {
          openTagStack.push(token);
        }
        break;
      case types.TokenKind.EndTag:
        const openTag = openTagStack.pop()!;
        if (openTag.name !== token.name) {
          parseError();
        }
        parent = openTagStack.pop()!;
        if (parent) {
          parent.children.push(openTag);
          openTagStack.push(parent);
        } else {
          nodes.push(openTag);
        }
        break;
      case types.TokenKind.Expression:
      case types.TokenKind.Character:
        parent = openTagStack.pop()!;
        if (parent) {
          parent.children.push(token);
          openTagStack.push(parent);
        } else {
          nodes.push(token);
        }
        break;
    }
  }

  if (openTagStack.length) {
    parseError();
  }

  return nodes;
}
