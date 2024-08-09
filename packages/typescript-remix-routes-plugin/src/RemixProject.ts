import type { RemixConfig } from '@remix-run/dev/dist/config';
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import { EventEmitter } from 'events';
import * as path from 'path';
import ts from 'typescript';
import { trimSlash } from './helpers';
import { LanguageServiceLogger } from './LanguageServiceLogger';
import { requireModule, resolveTypings } from './module';

const REMIX_RUNTIMES = [
  '@remix-run/node',
  '@remix-run/deno',
  '@remix-run/cloudflare',
];

export interface Route {
  path: string;
  fileName: string;
  relativeFileName: string;
  params: string[];
}

export interface Runtime {
  name: string;
  typings: string;
}

export class RemixProject extends EventEmitter {
  root: string;
  runtime?: Runtime;
  config?: RemixConfig;
  routes: Route[] = [];

  constructor(
    private logger: LanguageServiceLogger,
    private project: ts.server.Project,
  ) {
    super();
    this.root = project.getCurrentDirectory();
    this.runtime = this.detectRuntime();
  }

  async load() {
    let readConfig: typeof import('@remix-run/dev/dist/config').readConfig;
    try {
      readConfig = requireModule('@remix-run/dev/config', this.root).readConfig;
    } catch (e) {
      readConfig = requireModule(
        '@remix-run/dev/dist/config',
        this.root,
      ).readConfig;
    }
    this.config = await readConfig(this.root);
    this.routes = this.loadRoutes();
  }

  ready() {
    return !!this.config;
  }

  loadRoutes() {
    const routesInfo: Route[] = [];
    const handleRoutesRecursive = (
      parentId?: string,
      parentPath: ConfigRoute[] = [],
    ) => {
      let routes = Object.values(this.config!.routes).filter(
        (route) => route.parentId === parentId,
      );
      routes.forEach((route) => {
        let currentPath = parentPath;
        if (route.id !== 'root') {
          currentPath = [...currentPath, route];
          const fullPath = currentPath.reduce(
            (acc, curr) => [acc, trimSlash(curr.path || '')].join('/'),
            '',
          );
          routesInfo.push({
            path: fullPath,
            fileName: path.join(this.config!.appDirectory, route.file),
            relativeFileName: route.file,
            params: this.parse(currentPath),
          });
        }
        handleRoutesRecursive(route.id, currentPath);
      });
    };
    handleRoutesRecursive();
    return routesInfo;
  }

  watch() {
    const addRoot = this.project.addRoot;
    this.project.addRoot = (...args) => {
      this.load();
      addRoot.apply(this.project, args);
    };

    const removeFile = this.project.removeFile;
    this.project.removeFile = (...args) => {
      this.load();
      removeFile.apply(this.project, args);
    };

    const configFile = this.project.getScriptInfo(
      path.join(this.project.getCurrentDirectory(), 'remix.config.js'),
    );
    if (configFile) {
      const editContent = configFile.editContent;
      configFile.editContent = (...args) => {
        editContent.apply(configFile, args);
      };
    }
  }

  findRoutesByText(text: string) {
    return this.routes.filter(({ path }) => {
      const routeSegments = path.split('/');
      const textSegments = text.split('/');
      if (routeSegments.length !== textSegments.length) {
        return false;
      }
      const length =
        routeSegments.length > textSegments.length
          ? routeSegments.length
          : textSegments.length;
      for (let i = 0; i < length; i++) {
        const routeSegment = routeSegments[i];
        const textSegment = textSegments[i];

        if (routeSegment.startsWith(':')) {
          if (!textSegment.startsWith(':')) {
            return false;
          }
        } else if (routeSegment !== textSegment) {
          return false;
        }
      }
      return true;
    });
  }

  findRoutesByFile(fileName: string) {
    return this.routes.filter((route) => route.fileName == fileName);
  }

  detectRuntime(): Runtime | undefined {
    const pkg = require(path.join(this.root, 'package.json'));
    for (const dep of Object.keys(pkg.dependencies)) {
      if (REMIX_RUNTIMES.includes(dep)) {
        return {
          name: dep,
          typings: resolveTypings(dep, this.root),
        };
      }
    }
  }

  parse(routes: ConfigRoute[]) {
    const paramNames: string[] = [];
    routes.forEach((route) => {
      return (
        route.path &&
        paramNames.push(
          ...route.path
            .split('/')
            .filter((seg) => seg.startsWith(':'))
            .map((param) => param.replace(':', '')),
        )
      );
    });
    return paramNames;
  }
}
