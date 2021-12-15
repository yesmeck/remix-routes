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

interface Helper {
  segments: string[];
  paramsNames: string[];
  fullPath: string;
}

export async function build(remixRoot: string) {
  const config = await readConfig(remixRoot);
  const helpers: Record<string, Helper[]> = {};
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
        const functionName = camelCase([segments, 'path'].join('_'));
        helpers[functionName] = helpers[functionName] || [];
        helpers[functionName].push({
          segments,
          paramsNames,
          fullPath: fullPath,
        });
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  }
  handleRoutesRecursive();
  generate(helpers);
}

function watch(remixRoot: string) {
  chokidar.watch([path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'), path.join(remixRoot, 'remix.config.js')]).on('change', () => {
    build(remixRoot);
  });
  console.log('Watching for routes changes...');
}

function generate(paths: Record<string, Helper[]>) {
  const jsCode: string[] = [];
  const tsCode: string[] = [];
  Object.entries(paths).forEach(([functionName, helpers]) => {
    jsCode.push(
      generateHelpers(functionName, helpers)
    );
    tsCode.push(
      generateDefinition(functionName, helpers)
    );
  });
  const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }
  jsCode.push(`export function rootPath() {
  return '/';
}`);
  tsCode.push(`export declare function rootPath(): string;`);
  fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode.join('\n'));
  fs.writeFileSync(path.join(outputPath, 'index.d.ts'), tsCode.join('\n'));
  fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
    "name": ".remix-routes",
    "main": "index.js",
    "types": "index.d.ts"
  }));
}

function generateHelpers(functionName: string, helpers: Helper[]) {
  const code = [];
  if (helpers.length === 1) {
    const helper = helpers[0];
    const paramNames = helper.paramsNames;
    code.push(`export function ${functionName}(${paramNames.join(', ')}) {`)
    if (paramNames.length <= 0) {
      code.push(`  return '${helper.fullPath}';`);
    } else {
      code.push(`  return ${helper.fullPath.split('/').filter(Boolean).map(segment => {
        if (segment.startsWith(':')) {
          return `'/' + ${segment.slice(1)}`;
        }
        return `'/${segment}'`;
      }).join(' + ')};`)
    }
    code.push('}');
  } else {
    code.push(`export function ${functionName}(...args) {`);
    helpers.forEach(helper => {
      code.push(`  if (args.length === ${helper.paramsNames.length}) {`);
      if (helper.paramsNames.length <= 0) {
        code.push(`    return '${helper.fullPath}';`);
      } else {
        code.push(`    return ${helper.fullPath.split('/').filter(Boolean).map(segment => {
          if (segment.startsWith(':')) {
            return `'/' + ${segment.slice(1)}`;
          }
          return `'/${segment}'`;
        }).join(' + ')};`)
      }
      code.push('  }');
    });
    code.push('}');
  }
  return code.join('\n') + '\n';
}

function generateDefinition(functionName: string, helpers: Helper[]) {
  const code: string[] = [];
  helpers.forEach(helper => {
    const paramNames = helper.paramsNames;
    const typedParams = paramNames.map(paramName => `${paramName}: string | number`);
    code.push(`export declare function ${functionName}(${typedParams.join(', ')});`);
  });
  return code.join('\n') + '\n';
}

function parse(routes: ConfigRoute[]): [string[], string[]] {
  const segments: string[] = [];
  const paramNames: string[] = [];
  routes.forEach((route, index) => {
    if (route.path?.startsWith(':')) {
      return paramNames.push(route.path.replace(':', ''));
    }
    let hasParamOrAction = false;
    const [segment, ...paramOrActions] = route.path!.split('/');
    paramOrActions.forEach(paramOrAction => {
      hasParamOrAction = true;
      if (paramOrAction.startsWith(':')) {
        paramNames.push(paramOrAction.replace(':', ''));
      } else {
        segments.unshift(paramOrAction);
      }
    });

    if (route.index) {
      return segments.push(segment);
    }

    if (index === routes.length - 1 && !hasParamOrAction) {
      return segments.push(segment);
    }

    const singularSegment = pluralize.singular(segment)
    if (singularSegment) {
      segments.push(singularSegment);
    } else {
      segments.push(segment);
    }
  });
  return [segments, paramNames];
}


if (require.main === module) {
  const remixRoot = process.env.REMIX_ROOT || process.cwd()

  if (cli.flags.watch) {
    watch(remixRoot);
  } else {
    build(remixRoot);
  }
}
