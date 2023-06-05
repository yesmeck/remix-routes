#!/usr/bin/env node
import meow from 'meow';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import mkdirp from 'mkdirp';
import slash from 'slash';
import ejs from 'ejs';
import { template } from './template';

let readConfig: typeof import('@remix-run/dev/dist/config').readConfig;

try {
  readConfig = require('@remix-run/dev/config').readConfig;
} catch (e) {
  readConfig = require('@remix-run/dev/dist/config').readConfig;
}

const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
--outputDirPath, -o Specify the output path for "remix-routes.d.ts". Defaults to "./node_modules" if arg is not given.
`;

const DEFAULT_OUTPUT_DIR_PATH = './node_modules'

const cli = meow(helpText, {
  flags: {
    watch: {
      type: 'boolean',
      alias: 'w',
    },
    outputDirPath: {
      type: 'string',
      alias: 'o',
      default: DEFAULT_OUTPUT_DIR_PATH,
    }
  },
});

type RoutesInfo = Record<string, {
  fileName: string;
  params: string[];
}>

async function buildHelpers(remixRoot: string): Promise<RoutesInfo> {
  const config = await readConfig(remixRoot);
  const routesInfo: RoutesInfo = {};
  const handleRoutesRecursive = (
    parentId?: string,
    parentPath: ConfigRoute[] = [],
  ) => {
    let routes = Object.values(config.routes).filter(
      (route) => route.parentId === parentId,
    );
    routes.forEach((route) => {
      let currentPath = parentPath;
      if (route.id === 'root') {
        routesInfo['/'] = {
          fileName: route.file,
          params: [],
        };
      } else {
        currentPath = [...currentPath, route];
        const fullPath = currentPath.reduce(
          (acc, curr) => [acc, trimSlash(curr.path)].filter(p => p != undefined).join('/'),
          '',
        );
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
  return routesInfo;
}

export async function build(remixRoot: string, outputDirPath: string) {
  const routesInfo = await buildHelpers(remixRoot);
  generate(routesInfo, remixRoot, outputDirPath);
}

function watch(remixRoot: string, outputDirPath: string) {
  build(remixRoot, outputDirPath);
  chokidar
    .watch([
      path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'),
      path.join(remixRoot, 'remix.config.js'),
    ])
    .on('change', () => {
      build(remixRoot, outputDirPath);
    });
  console.log('Watching for routes changes...');
}

function generate(routesInfo: RoutesInfo, remixRoot: string, outputDirPath: string) {
  const tsCode = ejs.render(template, {
    routes: Object.entries(routesInfo).map(([route, { fileName, params }]) => ({
      route,
      params,
      fileName: slash(fileName.replace(/\.tsx?$/, '')),
    })).sort((a, b) => a.route.localeCompare(b.route)),
  });

  const outputPath = path.join(
    remixRoot,
    outputDirPath,
  );

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

if (require.main === module) {
  (async function () {
    const remixRoot = process.env.REMIX_ROOT || process.cwd();

    if (cli.flags.watch) {
      watch(remixRoot, cli.flags.outputDirPath);
    } else {
      build(remixRoot, cli.flags.outputDirPath);
    }
  })();
}

function trimSlash(path?: string) {
  if (!path) return path;
  return path.replace(/\/+$/, '');
}
