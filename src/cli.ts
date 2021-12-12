import meow from 'meow';
import { camelCase } from 'camel-case';
import pluralize from 'pluralize';
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

interface PathInfo {
  segments: string[];
  paramsNames: string[];
  fullPath: string;
}

export async function build(remixRoot: string) {
  const config = await readConfig(remixRoot);
  const paths: Array<PathInfo> = [];
  const handleRoutesRecursive = (parentId?: string, parentPath: ConfigRoute[] = []) => {
    let routes = Object.values(config.routes).filter(
      route => route.parentId === parentId
    );
    routes.forEach(route => {
      let currentPath = parentPath
      if (route.path) {
        currentPath = [...currentPath, route]
        const fullPath = currentPath.reduce((acc, curr) => [acc, curr.path].join('/'), '');
        const [segments, paramsNames] = parse(currentPath);
        paths.push({
          segments,
          paramsNames,
          fullPath: fullPath,
        });
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  }
  handleRoutesRecursive();
  generate(paths);
}

function watch(remixRoot: string) {
  chokidar.watch([path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'), path.join(remixRoot, 'remix.config.js')]).on('change', () => {
    build(remixRoot);
  });
  console.log('Watching for routes changes...');
}

function generate(paths: Array<PathInfo>) {
  const jsCode: string[] = [];
  const tsCode: string[] = [];
  paths.forEach(path => {
    const functionName = camelCase([...path.segments, 'path'].join('_'));
    jsCode.push(
      generateHelpers(functionName, path.paramsNames, path.fullPath)
    );
    tsCode.push(
      generateDefinition(functionName, path.paramsNames)
    );
  });
  const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }
  fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode.join('\n'));
  fs.writeFileSync(path.join(outputPath, 'index.d.ts'), tsCode.join('\n'));
  fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
    "name": ".remix-routes",
    "main": "index.js",
    "types": "index.d.ts"
  }));
}

function generateHelpers(functionName: string, paramNames: string[], originalPath: string) {
  const code = [];
  code.push(`export function ${functionName}(${paramNames.join(', ')}) {`)
  if (paramNames.length <= 0) {
    code.push(`  return '${originalPath}';`);
  } else {
    code.push(`  return ${originalPath.split('/').filter(Boolean).map(segment => {
      if (segment.startsWith(':')) {
        return `'/' + ${segment.slice(1)}`;
      }
      return `'/${segment}'`;
    }).join(' + ')};`)
  }
  code.push('}');
  return code.join('\n') + '\n';
}

function generateDefinition(functionName: string, paramNames: string[]) {
  const typedParams = paramNames.map(paramName => `${paramName}: string | number`);
  return `export declare function ${functionName}(${typedParams.join(', ')}): string;`;
}

function parse(
  routes: ConfigRoute[],
): [string[], string[]] {
  const segments: string[] = [];
  const paramNames: string[] = [];
  routes.forEach(route => {
    const [segment, paramOrAction] = route.path!.split('/');
    if (paramOrAction) {
      if (paramOrAction.startsWith(':')) {
        paramNames.push(paramOrAction.replace(':', ''));
      } else {
        segments.unshift(paramOrAction);
      }
    }
    if (route.index) {
      segments.push(segment);
    } else {
      segments.push(
        pluralize(segment, 1)
      );
    }
  });
  return [segments, paramNames];
}

const remixRoot = process.env.REMIX_ROOT || process.cwd()

if (require.main === module) {
  if (cli.flags.watch) {
    watch(remixRoot);
  } else {
    build(remixRoot);
  }
}
