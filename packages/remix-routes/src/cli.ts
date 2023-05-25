#!/usr/bin/env node
import meow from 'meow';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import mkdirp from 'mkdirp';
import slash from 'slash';

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
      if (route.path) {
        currentPath = [...currentPath, route];
        const fullPath = currentPath.reduce(
          (acc, curr) => [acc, trimSlash(curr.path!)].join('/'),
          '',
        );
        const paramsNames = parse(currentPath);
        routesInfo[fullPath] = {
          fileName: route.file,
          params: paramsNames
        };
      } else if (route.id === 'root') {
        routesInfo['/'] = {
          fileName: route.file,
          params: [],
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
  const tsCode =
    [
      `
declare module "remix-routes" {

type IsAny<T> = (
  unknown extends T
    ? [keyof T] extends [never] ? false : true
    : false
);
type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
type ExportedQuery<T> = IsAny<T> extends true ? URLSearchParamsInit : T;
type Query<T> = IsAny<T> extends true ? [URLSearchParamsInit?] : [T];
      `,
      generateRouteDefinition(routesInfo),
      generatePathDefinition(),
      generateParamsDefinition(),
      "}",
    ].join('\n\n') + '\n\n';

  const outputPath = path.join(
    remixRoot,
    outputDirPath,
  );

  if (!fs.existsSync(outputPath)) {
    mkdirp.sync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'remix-routes.d.ts'), tsCode);
}

function generateRouteDefinition(routesInfo: RoutesInfo) {
  const code: string[] = ['export interface Routes {'];
  Object.entries(routesInfo).forEach(([route, { fileName, params }]) => {
    const lines = [`  "${route}": {`];
    const paramsType = params.map(
      (param) => `${param}: string | number`,
    );
    lines.push(`    params: { ${paramsType.join('; ')} },`);
    lines.push(`    query: ExportedQuery<import('../app/${slash(fileName.replace(/\.tsx?$/, ''))}').SearchParams>,`)
    lines.push('  };')
    code.push(lines.join('\n'));
  });
  code.push("}");
  code.push('');
  code.push(`type RoutesWithParams = Pick<
  Routes,
  {
    [K in keyof Routes]: Routes[K]["params"] extends Record<string, never> ? never : K
  }[keyof Routes]
>;`);
  return code.join('\n');
}

function generatePathDefinition() {
  return `export declare function $path<
  Route extends keyof Routes,
  Rest extends {
    params: Routes[Route]["params"];
    query?: Routes[Route]["query"];
  }
>(
  ...args: Rest["params"] extends Record<string, never>
    ? [route: Route, query?: Rest["query"]]
    : [route: Route, params: Rest["params"], query?: Rest["query"]]
): string;`
}

function generateParamsDefinition() {
  return `export declare function $params<
  Route extends keyof RoutesWithParams,
  Params extends RoutesWithParams[Route]["params"]
>(
    route: Route,
    params: { readonly [key: string]: string | undefined }
): {[K in keyof Params]: string};`;
}

function parse(routes: ConfigRoute[]) {
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

function trimSlash(path: string) {
  return path.replace(/\/+$/, '');
}
