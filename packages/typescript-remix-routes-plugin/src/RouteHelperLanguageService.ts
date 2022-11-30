import path from 'path';
import * as ts from 'typescript/lib/tsserverlibrary';
import { LanguageService } from './LanguageService';
import { RemixProject } from './RemixProject';
import { RouteContext } from './RouteContext';
import { ScriptSourceHelper } from './ScriptSourceHelper';

export class RouteHelperLanguageService extends LanguageService {
  constructor(
    private tsProject: ts.server.Project,
    private remixProject: RemixProject,
    private sourceHelper: ScriptSourceHelper,
  ) {
    super();
    this.tryAdaptGetQuickInfoAtPosition();
    this.tryAdaptGetDefinitionAndBoundSpan();
  }

  tryAdaptGetQuickInfoAtPosition() {
    this.wrap(
      'getQuickInfoAtPosition',
      (delegate) =>
        (fileName: string, position: number): ts.QuickInfo | undefined => {
          const context = this.getRoute(fileName, position);
          if (!context) {
            return delegate(fileName, position);
          }

          const routes = this.remixProject.findRoutesByText(context.rawText);

          return {
            kind: ts.ScriptElementKind.string,
            kindModifiers: '',
            displayParts: routes.slice(0, 1).map((route) => ({
              text: `(remix) file: ${path.join('~/app', route.relativeFileName)}`,
              kind: ts.SymbolDisplayPartKind.methodName as any,
            })),
            textSpan: {
              start: 0,
              length: context.node.getFullWidth(),
            },
          };
        },
    );
  }

  tryAdaptGetDefinitionAndBoundSpan() {
    this.wrap(
      'getDefinitionAndBoundSpan',
      (delegate) =>
        (fileName: string, position: number, ...rest: any[]) => {
          const context = this.getRoute(fileName, position);
          if (context) {
            const routes = this.remixProject.findRoutesByText(context.rawText);

            const textSpan = {
              start: 0,
              length: 0,
            };

            return {
              definitions: routes.map((route) => ({
                name: route.fileName,
                kind: ts.ScriptElementKind.string,
                containerKind: ts.ScriptElementKind.unknown,
                containerName: '',
                fileName: route.fileName,
                textSpan,
              })),
              textSpan,
            };
          }

          return (delegate as any)(fileName, position, ...rest);
        },
    );
  }

  getRoute(fileName: string, position: number): RouteContext | undefined {
    const node = this.getValidRouteNode(
      this.sourceHelper.getNode(fileName, position),
    );
    if (!node) {
      return undefined;
    }

    // Make sure we are inside the route string
    if (position <= node.pos) {
      return undefined;
    }

    return new RouteContext(fileName, node);
  }

  private getValidRouteNode(
    node: ts.Node | undefined,
  ): ts.StringLiteral | undefined {
    if (!node) {
      return undefined;
    }
    if (node.kind !== ts.SyntaxKind.StringLiteral) {
      return undefined;
    }

    const parentExpressionText = (
      node.parent as ts.CallExpression
    )?.expression?.getText();

    if (
      parentExpressionText !== '$path' &&
      parentExpressionText !== '$params'
    ) {
      return undefined;
    }

    return node as ts.StringLiteral;
  }
}
