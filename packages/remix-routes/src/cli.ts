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
  try {
    readConfig = require('@remix-run/dev/dist/config').readConfig;
  } catch (e) {
    readConfig = require('@vercel/remix-run-dev/dist/config').readConfig;
  }
}

const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
--strict, -s  Enable strict mode
--outputDirPath, -o Specify the output path for "remix-routes.d.ts". Defaults to "./node_modules" if arg is not given.
`;

const DEFAULT_OUTPUT_DIR_PATH = './node_modules'

const cli = meow(helpText, {
  flags: {
    watch: {
      type: 'boolean',
      alias: 'w',
    },
    strict: {
      type: 'boolean',
      alias: 's',
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

async function buildHelpers(remixRoot: string): Promise<[RoutesInfo, string[]]> {
  const config = await readConfig(remixRoot);
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
        routeIds.push(route.id);
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  };
  handleRoutesRecursive();
  return [routesInfo, routeIds] as const;
}

export async function build(remixRoot: string, flags: typeof cli.flags) {
  const [routesInfo, routeIds] = await buildHelpers(remixRoot);
  generate(routesInfo, routeIds, remixRoot, flags);
}

function watch(remixRoot: string, flags: typeof cli.flags) {
  build(remixRoot, flags);
  chokidar
    .watch([
      path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'),
      path.join(remixRoot, 'remix.config.js'),
    ])
    .on('change', () => {
      build(remixRoot, flags);
    });
  console.log('Watching for routes changes...');
}

function generate(routesInfo: RoutesInfo, routeIds: string[], remixRoot: string, flags: typeof cli.flags) {
  const tsCode = ejs.render(template, {
    strictMode: flags.strict,
    routes: Object.entries(routesInfo).map(([route, { fileName, params }]) => ({
      route,
      params,
      fileName: slash(fileName.replace(/\.tsx?$/, '')),
    })).sort((a, b) => a.route.localeCompare(b.route)),
    routeIds
  });

  const outputPath = path.join(
    remixRoot,
    flags.outputDirPath,
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

    console.log(cli.flags);

    if (cli.flags.watch) {
      watch(remixRoot, cli.flags);
    } else {
      build(remixRoot, cli.flags);
    }
  })();
}

function trimSlash(path?: string) {
  if (!path) return path;
  return path.replace(/\/+$/, '');
}
