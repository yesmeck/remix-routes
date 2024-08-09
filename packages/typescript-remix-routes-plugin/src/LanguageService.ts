import * as ts from 'typescript';
import { RouteContext } from './RouteContext';

type LanguageServiceMethodWrapper<K extends keyof ts.LanguageService> = (
  delegate: ts.LanguageService[K],
  info?: ts.server.PluginCreateInfo,
) => ts.LanguageService[K];

export abstract class LanguageService {
  private readonly _wrappers: Array<{
    name: keyof ts.LanguageService;
    wrapper: LanguageServiceMethodWrapper<any>;
  }> = [];

  decorate(languageService: ts.LanguageService) {
    const intercept: Partial<ts.LanguageService> = Object.create(null);

    for (const { name, wrapper } of this._wrappers) {
      (intercept[name] as any) = wrapper(
        languageService[name]!.bind(languageService),
      );
    }

    return new Proxy(languageService, {
      get: (target: any, property: string | symbol) => {
        return (intercept as any)[property] || target[property];
      },
    });
  }

  wrap<K extends keyof ts.LanguageService>(
    name: K,
    wrapper: LanguageServiceMethodWrapper<K>,
  ) {
    this._wrappers.push({ name, wrapper });
    return this;
  }

  translateTextSpan(
    context: RouteContext,
    span: ts.TextSpan,
  ): ts.TextSpan {
    return {
      start: context.node.getStart() + 1 + span.start,
      length: span.length,
    };
  }

  translateDefinitionInfo(
    context: RouteContext,
    definition: ts.DefinitionInfo,
  ): ts.DefinitionInfo {
    return {
      ...definition,
      fileName: definition.fileName || context.fileName,
      textSpan: this.translateTextSpan(context, definition.textSpan),
    };
  }
}
