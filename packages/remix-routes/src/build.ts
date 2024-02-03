#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { RemixConfig } from "@remix-run/dev/dist/config";
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import mkdirp from 'mkdirp';
import slash from 'slash';
import ejs from 'ejs';
import { template } from './template';

interface Options {
  strict?: boolean;
  outputDirPath: string;
}

type RoutesInfo = Record<string, {
  fileName: string;
  params: string[];
}>

export const DEFAULT_OUTPUT_DIR_PATH = './node_modules'

async function buildHelpers(config: RemixConfig): Promise<[RoutesInfo, string[]]> {
  const routesInfo: RoutesInfo = {};
  const routeIds: string[] = [];
  const handleRoutesRecursive = (
    parentId?: string,
    parentPath: ConfigRoute[] = [],
  ) => {
    let routes = Object.values(config.routes).filter(
      (route) => route.parentId === parentId,
    );
    routes.forEach((route) => {
      let currentPath = parentPath;
      routeIds.push(route.id);
      if (route.id === 'root') {
        routesInfo['/'] = {
          fileName: route.file,
          params: [],
        };
      } else {
        currentPath = [...currentPath, route];
        const fullPath = dedupPrefixSlash(currentPath.reduce(
          (acc, curr) => [acc, trimSlash(curr.path)].filter(p => p != undefined).join('/'),
          '',
        ));
        const paramsNames = parse(currentPath);
        routesInfo[fullPath] = {
          fileName: route.file,
          params: paramsNames
        };
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  };
  handleRoutesRecursive();
  return [routesInfo, routeIds];
}

export async function build(remixRoot: string, remixConfig: RemixConfig, options: Options) {
  const [routesInfo, routeIds] = await buildHelpers(remixConfig);
  generate(remixRoot, remixConfig, routesInfo, routeIds, options);
}

export async function watch(remixRoot: string, remixConfig: RemixConfig, options: Options) {
  build(remixRoot, remixConfig, options);
  const { rootDirectory, appDirectory } = remixConfig
  chokidar
    .watch([
      path.join(appDirectory, 'routes/**/*.{ts,tsx}'),
      path.join(rootDirectory, 'remix.config.js'),
    ])
    .on('change', () => {
      build(remixRoot, remixConfig, options);
    });
  console.log('Watching for routes changes...');
}

function generate(remixRoot: string, remixConfig: RemixConfig, routesInfo: RoutesInfo, routeIds: string[], options: Options) {
  const outputPath = path.join(
    remixRoot,
    options.outputDirPath,
  );
  const relativeAppDirPath = slash(path.relative(outputPath, remixConfig.appDirectory));
  routeIds.sort((a, b) => a.localeCompare(b));
  const tsCode = ejs.render(template, {
    strictMode: options.strict,
    relativeAppDirPath,
    routes: Object.entries(routesInfo).map(([route, { fileName, params }]) => ({
      route,
      params,
      fileName: slash(fileName.replace(/\.tsx?$/, '')),
    })).sort((a, b) => a.route.localeCompare(b.route)),
    routeIds,
  });

  if (!fs.existsSync(outputPath)) {
    mkdirp.sync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'remix-routes.d.ts'), tsCode);
}

function parse(routes: ConfigRoute[]) {
  const paramNames: string[] = [];
  routes.forEach((route) => {
    return (
      route.path &&
      paramNames.push(
        ...route.path
          .split('/')
          .filter((seg) => seg.startsWith(':') || seg == '*')
          .map((param) => param.replace(':', '').replace('*', '"*"')),
      )
    );
  });
  return paramNames;
}

function dedupPrefixSlash(path: string) {
  return path.replace(/^\/+/, '/');
}

function trimSlash(path?: string) {
  if (!path) return path;
  return path.replace(/\/+$/, '');
}
