#!/usr/bin/env node
import meow from 'meow';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { ConfigRoute } from '@remix-run/dev/dist/config/routes';
import { readConfig } from '@remix-run/dev/dist/config';

const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
`;

const cli = meow(helpText, {
  flags: {
    watch: {
      type: "boolean",
      alias: "w"
    }
  }
});

type RoutesInfo = Record<string, string[]>;

async function buildHelpers(remixRoot: string): Promise<RoutesInfo> {
  const config = await readConfig(remixRoot);
  const routesInfo: RoutesInfo = {};
  const handleRoutesRecursive = (parentId?: string, parentPath: ConfigRoute[] = []) => {
    let routes = Object.values(config.routes).filter(
      route => route.parentId === parentId
    );
    routes.forEach(route => {
      let currentPath = parentPath
      if (route.path) {
        currentPath = [...currentPath, route]
        const fullPath = currentPath.reduce((acc, curr) => [acc, curr.path].join('/'), '');
        const paramsNames = parse(currentPath);
        routesInfo[fullPath] = paramsNames;
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  }
  handleRoutesRecursive();
  return routesInfo;
}

export async function build(remixRoot: string) {
  const routesInfo = await buildHelpers(remixRoot);
  generate(routesInfo);
}

function watch(remixRoot: string) {
  build(remixRoot);
  chokidar.watch([path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'), path.join(remixRoot, 'remix.config.js')]).on('change', () => {
    build(remixRoot);
  });
  console.log('Watching for routes changes...');
}

function generate(routesInfo: RoutesInfo) {
  const jsCode = generateHelpers(routesInfo);
  const tsCode = generateDefinition(routesInfo);
  const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode);
  fs.writeFileSync(path.join(outputPath, 'types.d.ts'), tsCode);
  fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
    "name": ".remix-routes",
    "main": "index.js",
  }));
}

function generateHelpers(routesInfo: RoutesInfo) {
  const routes = Object.entries(routesInfo).reduce((acc: Record<string, string[]>, [route, params]) => {
    if (params.length > 0) {
      acc[route] = params;
    }
    return acc;
  }, {})
  return `
const routes = ${JSON.stringify(routes, null, 2)};

module.exports = { routes }
`;
}

function generateDefinition(routesInfo: RoutesInfo) {
  const code: string[] = [];
  Object.entries({
    '/': [],
    ...routesInfo,
  }).forEach(([route, paramsNames]) => {
    const lines = ['export declare function $path(']
    lines.push(`  route: ${JSON.stringify(route)},`)
    if (paramsNames.length > 0) {
      const paramsType = paramsNames.map(paramName => `${paramName}: string | number`);
      lines.push(`  params: { ${paramsType.join('; ')} },`)
    }
    lines.push(`  query?: Record<string, string | number>`)
    lines.push(`): string;`);
    code.push(lines.join('\n'));
  });
  code.push('\n');
  return code.join('\n');
}

function parse(routes: ConfigRoute[]) {
  const paramNames: string[] = [];
  routes.forEach((route) => {
    if (route.path?.startsWith(':')) {
      return paramNames.push(...route.path.split('/').map(param => param.replace(':', '')));
    }
    const [_, ...paramOrActions] = route.path!.split('/');
    paramOrActions.forEach(paramOrAction => {
      if (paramOrAction.startsWith(':')) {
        paramNames.push(paramOrAction.replace(':', ''));
      }
    });
  });
  return paramNames;
}


if (require.main === module) {
  (async function() {
    const remixRoot = process.env.REMIX_ROOT || process.cwd()

    if (cli.flags.watch) {
      watch(remixRoot);
    } else {
      build(remixRoot);
    }
  })();
}
