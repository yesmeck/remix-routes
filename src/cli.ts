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

type RoutesInfo = Record<string, string[]>;

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
        routesInfo[fullPath] = paramsNames;
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  };
  handleRoutesRecursive();
  return routesInfo;
}

export async function build(remixRoot: string) {
  const routesInfo = await buildHelpers(remixRoot);
  generate(routesInfo);
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

function generate(routesInfo: RoutesInfo) {
  const jsCode = generateHelpers(routesInfo);
  const tsCode =
    [
      generatePathDefinition(routesInfo),
      generateParamsDefinition(routesInfo),
    ].join('\n\n') + '\n\n';

  const outputPath = path.join(
    process.cwd(),
    'node_modules',
    'remix-routes',
  );

  if (!fs.existsSync(outputPath)) {
    mkdirp.sync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode);
  fs.writeFileSync(path.join(outputPath, 'index.d.ts'), tsCode);
  fs.writeFileSync(
    path.join(outputPath, 'package.json'),
    JSON.stringify({
      name: 'remix-routes',
      main: 'index.js',
    }),
  );
}

function generateHelpers(routesInfo: RoutesInfo) {
  const routes = Object.entries(routesInfo).reduce(
    (acc: Record<string, string[]>, [route, params]) => {
      if (params.length > 0) {
        acc[route] = params;
      }
      return acc;
    },
    {},
  );
  const helper = fs.readFileSync(path.resolve(__dirname, '../helper.js'), 'utf-8')
  return helper.replace('// __routes__', `const routes = ${JSON.stringify(routes, null, 2)}`);
}

function generatePathDefinition(routesInfo: RoutesInfo) {
  const code: string[] = [];
  Object.entries({
    '/': [],
    ...routesInfo,
  }).forEach(([route, paramsNames]) => {
    const lines = ['export declare function $path('];
    lines.push(`  route: ${JSON.stringify(route)},`);
    if (paramsNames.length > 0) {
      const paramsType = paramsNames.map(
        (paramName) => `${paramName}: string | number`,
      );
      lines.push(`  params: { ${paramsType.join('; ')} },`);
    }
    lines.push(
      `  query?: string | string[][] | Record<string, string> | URLSearchParams`,
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
    ([_, paramsNames]) => paramsNames.length > 0,
  );

  const code = routesWithParams.map(([route, paramsNames]) => {
    const lines: string[] = [];

    lines.push(`export declare function $params(`);
    lines.push(`  route: ${JSON.stringify(route)},`);
    lines.push(`  params: { readonly [key: string]: string | undefined }`);
    lines.push(`): {`);
    lines.push(
      paramsNames.map((paramName) => `  ${paramName}: string`).join(',\n'),
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
