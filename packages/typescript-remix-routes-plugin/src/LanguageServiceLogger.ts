import type ts from "typescript";

export class LanguageServiceLogger {
  constructor(private readonly info: ts.server.PluginCreateInfo) {}

  public log(msg: string) {
    this.info.project.projectService.logger.info(
      `[typescript-remix-routes-plugin] ${msg}`
    );
  }
}
