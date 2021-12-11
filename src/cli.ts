import meow from 'meow';
import { camelCase } from 'camel-case';
import { readConfig } from '@remix-run/dev/config.js';
import * as fs from 'fs';
import * as path from 'path';

const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
`;

const cli = meow(helpText, {
  importMeta: import.meta,
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

async function build(flags: { watch?: boolean }) {
  const config = await readConfig();
  const paths: Array<PathInfo> = [];
  const handleRoutesRecursive = (parentId?: string, parentPath: string = '') => {
    let routes = Object.values(config.routes).filter(
      route => route.parentId === parentId
    );
    routes.forEach(route => {
      let currentPath = parentPath
      if (route.path) {
        currentPath = [currentPath, route.path].join('/');
        const [segments, paramsNames] = parse(currentPath);
        paths.push({
          segments,
          paramsNames,
          fullPath: currentPath,
        });
      }
      handleRoutesRecursive(route.id, currentPath);
    });
  }
  handleRoutesRecursive();
  generate(paths);
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
  return `export function ${functionName}(${paramNames.join(', ')}) {
  return ${originalPath.split('/').filter(Boolean).map(segment => {
    if (segment.startsWith(':')) {
      return `'/' + ${segment.slice(1)}`;
    }
    return `'/${segment}'`;
  }).join(' + ')};
}`;
}

function generateDefinition(functionName: string, paramNames: string[]) {
  const typedParams = paramNames.map(paramName => `${paramName}: string | number`);
  return `export declare function ${functionName}(${typedParams.join(', ')}): string;`;
}


function parse(
  path: string,
): [string[], string[]] {
  const segments: string[] = [];
  const paramNames: string[] = [];
  path.split('/').forEach(segment => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      segments.push(paramName);
      paramNames.push(paramName);
    } else {
      segments.push(segment);
    }
  });
  return [segments, paramNames];
}


build(cli.flags);
