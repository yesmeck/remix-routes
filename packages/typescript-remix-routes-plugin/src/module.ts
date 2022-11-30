import * as path from 'path';
import * as fs from 'fs';
import resolve from 'resolve';

export function requireModule(module: string, root: string) {
  const file = resolve.sync(module, {
    basedir: root,
  });
  return require(file);
}

export function resolveTypings(module: string, root: string) {
  const modulePath = path.join(root, 'node_modules', module);
  const modulePkg = require(path.join(modulePath, 'package.json'));
  return fs.realpathSync(
    path.resolve(
      modulePath,
      modulePkg.typings || modulePkg.types || 'index.d.ts',
    ),
  );
}
