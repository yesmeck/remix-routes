import { test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { build } from '../build';
import { readConfig } from '@remix-run/dev/dist/config';


function loadRemixConfig(rootDir: string) {
   return readConfig(rootDir);
}

test('build v1 routes', async () => {
  const readConfig = require('@remix-run/dev-1/dist/config').readConfig;
  const rootDir = path.resolve(__dirname, '../../fixture/v1');
  const config = await readConfig(rootDir);

  await build(rootDir, config, { outputDirPath: './node_modules', strict: false });

  expect(
    fs.readFileSync(path.resolve(__dirname, '../../fixture/v1/node_modules/remix-routes.d.ts'), 'utf8'),
  ).toMatchSnapshot();
});

test('build v2 routes', async () => {
  const rootDir = path.resolve(__dirname, '../../fixture/v2');
  const config = await loadRemixConfig(rootDir);

  await build(rootDir, config, { outputDirPath: './node_modules', strict: false });

  expect(
    fs.readFileSync(path.resolve(__dirname, '../../fixture/v2/node_modules/remix-routes.d.ts'), 'utf8'),
  ).toMatchSnapshot();
});

test("build customPaths routes", async () => {
  const rootDir = path.resolve(__dirname, '../../fixture/customPaths');
  const config = await loadRemixConfig(rootDir);

  await build(rootDir, config, { outputDirPath: "./types/remix-routes", strict: false });

  expect(
    fs.readFileSync(path.resolve( __dirname, "../../fixture/customPaths/types/remix-routes/remix-routes.d.ts"), "utf8"),
  ).toMatchSnapshot();
});
