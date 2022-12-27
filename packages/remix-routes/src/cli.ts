#!/usr/bin/env node
import meow from 'meow';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import mkdirp from 'mkdirp';

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
`;

const cli = meow(helpText, {
  flags: {
    watch: {
      type: 'boolean',
      alias: 'w',
    },
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

export async function build(remixRoot: string) {
  const routesInfo = await buildHelpers(remixRoot);
  generate(routesInfo, remixRoot);
}

function watch(remixRoot: string) {
  build(remixRoot);
  chokidar
    .watch([
      path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'),
      path.join(remixRoot, 'remix.config.js'),
    ])
    .on('change', () => {
      build(remixRoot);
    });
  console.log('Watching for routes changes...');
}

function generate(routesInfo: RoutesInfo, remixRoot: string) {
  const tsCode =
    [
      `
type IsAny<T> = (
  unknown extends T
    ? [keyof T] extends [never] ? false : true
    : false
);
type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
type Query<T> = IsAny<T> extends true ? [URLSearchParamsInit?] : [T];
      `,
      generatePathDefinition(routesInfo),
      generateParamsDefinition(routesInfo),
    ].join('\n\n') + '\n\n';

  const outputPath = path.join(
    remixRoot,
    'node_modules',
  );

  if (!fs.existsSync(outputPath)) {
    mkdirp.sync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'remix-routes.d.ts'), tsCode);
}

function generatePathDefinition(routesInfo: RoutesInfo) {
  const code: string[] = [];
  Object.entries(routesInfo).forEach(([route, { fileName, params }]) => {
    const lines = ['export declare function $path('];
    lines.push(`  route: ${JSON.stringify(route)},`);
    if (params.length > 0) {
      const paramsType = params.map(
        (param) => `${param}: string | number`,
      );
      lines.push(`  params: { ${paramsType.join('; ')} },`);
    }
    lines.push(
      `  ...query: Query<import('../app/${fileName.replace(/\.tsx?$/, '')}').SearchParams>`,
    );
    lines.push(`): string;`);
    code.push(lines.join('\n'));
  });
  return code.join('\n');
}

function generateParamsDefinition(routesInfo: RoutesInfo) {
  const routes = Object.entries(routesInfo);

  // $params helper makes sense only for routes with params.
  const routesWithParams = routes.filter(
    ([_, { params }]) => params.length > 0,
  );

  const code = routesWithParams.map(([route, { params }]) => {
    const lines: string[] = [];

    lines.push(`export declare function $params(`);
    lines.push(`  route: ${JSON.stringify(route)},`);
    lines.push(`  params: { readonly [key: string]: string | undefined }`);
    lines.push(`): {`);
    lines.push(
      params.map((param) => `  ${param}: string`).join(',\n'),
    );
    lines.push(`};`);

    return lines.join('\n');
  });

  return code.join('\n');
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
      watch(remixRoot);
    } else {
      build(remixRoot);
    }
  })();
}

function trimSlash(path: string) {
  return path.replace(/\/+$/, '');
}
