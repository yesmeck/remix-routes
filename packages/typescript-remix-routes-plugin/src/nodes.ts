import * as ts from 'typescript/lib/tsserverlibrary';

export function findNode(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  position: number,
): ts.Node | undefined {
  function find(node: ts.Node): ts.Node | undefined {
    if (position >= node.getStart() && position <= node.getEnd()) {
      return typescript.forEachChild(node, find) || node;
    }
  }
  return find(sourceFile);
}

export function findTemplateNodes(
  typescript: typeof ts,
  sourceFile: ts.SourceFile,
  tag: string,
): ts.TaggedTemplateExpression[] {
  const tags: ts.TaggedTemplateExpression[] = [];
  function find(node: ts.Node) {
    if (node) {
      if (isTaggedTemplateExpression(node) && node.tag.getText() === tag) {
        tags.push(node);
      }
    }
    typescript.forEachChild(node, find);
  }
  find(sourceFile);
  return tags;
}

function isTaggedTemplateExpression(
  node: ts.Node,
): node is ts.TaggedTemplateExpression {
  return node.kind === ts.SyntaxKind.TaggedTemplateExpression;
}
