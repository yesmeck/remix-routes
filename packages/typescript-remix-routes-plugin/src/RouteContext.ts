import * as ts from 'typescript';

export class RouteContext {
  constructor(
    public readonly fileName: string,
    public readonly node: ts.StringLiteral,
  ) {}

  public get text(): string {
    // this.node
    return this.node.getText();
  }

  public get rawText() {
    return this.node.getText().slice(1, -1);
  }
}
