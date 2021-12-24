import meow from 'meow';
import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import type { ConfigRoute } from '@remix-run/dev/config/routes';
import { readConfig } from '@remix-run/dev/config';

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
  chokidar.watch([path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'), path.join(remixRoot, 'remix.config.js')]).on('change', () => {
    build(remixRoot);
  });
  console.log('Watching for routes changes...');
}

function generate(routesInfo: RoutesInfo) {
  const jsCode = generateHelpers(routesInfo);
  const tsCode = generateDefinition(routesInfo);
  const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
  console.log(outputPath);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode);
  fs.writeFileSync(path.join(outputPath, 'index.d.ts'), tsCode);
  fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
    "name": ".remix-routes",
    "main": "index.js",
    "types": "index.d.ts"
  }));
}

function generateHelpers(routesInfo: RoutesInfo) {
  return `
const routes = ${JSON.stringify(routesInfo, null, 2)};

export function $path(route, ...paramsOrQuery) {
  const { paramsNames } = routesInfo[route];
  let path = route;
  let query = paramsOrQuery[0];
  if (paramsNames.length > 0) {
    const params = paramsOrQuery[0];
    let query = paramsOrQuery[1];
    paramsNames.forEach((name, index) => {
      path.replace(':' + name, params[name]);
    }
  }
  if (!query) {
    return path;
  }
  const searchParams = new URLSearchParams('');
  Object.entries(query).forEach(([key, value]) => {
    searchParams.append(key, value);
  });
  return path + '?' + searchParams.toString();
}
`;
}

function generateDefinition(routesInfo: RoutesInfo) {
  const code: string[] = [];
  Object.entries(routesInfo).forEach(([route, paramsNames]) => {
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
  (async function () {
    const remixRoot = process.env.REMIX_ROOT || process.cwd()

    if (cli.flags.watch) {
      watch(remixRoot);
    } else {
      build(remixRoot);
    }
  })();
}
