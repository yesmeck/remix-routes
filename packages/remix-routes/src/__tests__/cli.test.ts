import { test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { build } from '../cli';

test('build v1 routes', async () => {
  await build(path.resolve(__dirname, '../../fixture/v1'), { outputDirPath: './node_modules', watch: false, strict: false });
  expect(
    fs.readFileSync(path.resolve(__dirname, '../../fixture/v1/node_modules/remix-routes.d.ts'), 'utf8'),
  ).toMatchSnapshot();
});

test('build v2 routes', async () => {
  await build(path.resolve(__dirname, '../../fixture/v2'), { outputDirPath: './node_modules', watch: false, strict: false });
  expect(
    fs.readFileSync(path.resolve(__dirname, '../../fixture/v2/node_modules/remix-routes.d.ts'), 'utf8'),
  ).toMatchSnapshot();
});
