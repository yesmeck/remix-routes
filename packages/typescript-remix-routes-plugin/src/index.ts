import type tss from 'typescript/lib/tsserverlibrary';
import { LanguageServiceLogger } from './LanguageServiceLogger';
import { RemixProject } from './RemixProject';
import { RouteHelperLanguageService } from './RouteHelperLanguageService';
import { ScriptSourceHelper } from './ScriptSourceHelper';

function init(modules: { typescript: typeof tss }) {
  const ts = modules.typescript;

  function create(info: ts.server.PluginCreateInfo) {
    const logger = new LanguageServiceLogger(info);
    // Set up decorator object
    let proxy: ts.LanguageService = Object.create(null);
    for (let k of Object.keys(info.languageService) as Array<
      keyof ts.LanguageService
    >) {
      logger.log(k);
      const x = info.languageService[k]!;
      // @ts-expect-error - JS runtime trickery which is tricky to type tersely
      proxy[k] = (...args: Array<{}>) => x.apply(info.languageService, args);
    }

    const remixProject = new RemixProject(logger, info.project);

    if (!remixProject.runtime) {
      throw new Error('Can not defect remix runtime');
    }

    remixProject.load();
    remixProject.watch();

    const routeHelperLanguageService = new RouteHelperLanguageService(
      info.project,
      remixProject,
      new ScriptSourceHelper(ts, info.project),
    );

    return routeHelperLanguageService.decorate(proxy);
  }

  return { create };
}

export = init;
