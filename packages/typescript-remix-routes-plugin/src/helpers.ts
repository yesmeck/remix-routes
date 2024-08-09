import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export function hasModuleImported(sourceFile: any, module: string) {
  return sourceFile.imports.some((token: any) => token.text === module);
}

export function hasSymbolDefined(sourceFile: any, symbol: string) {
  for (const [local] of sourceFile.locals) {
    if (local === symbol) {
      return true;
    }
  }
  return false;
}

export function displayPart(
  text: string,
  kind: ts.SymbolDisplayPartKind,
): ts.SymbolDisplayPart {
  return { text, kind: ts.SymbolDisplayPartKind[kind] };
}

export function startsWithOrEqual(a: string, b: string) {
  if (a.length < b.length) {
    return false;
  }

  if (a.length === b.length) {
    return a === b;
  }

  return a.toLowerCase().startsWith(b.toLowerCase());
}

export function trimSlash(path: string) {
  return path.replace(/\/+$/, '');
}

export function findNearestNodeModulesPath(destDir: string) {
  let p = destDir;

  while (p !== '/') {
    const dest = path.join(p, 'node_modules');
    if (fs.existsSync(dest)) {
      return dest;
    }
    p = path.resolve(p, '..');
  }

  throw Error('Could not find node_modules dir');
}
