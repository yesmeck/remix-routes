import { test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { build } from '../cli';

test('build', async () => {
  await build(path.resolve(__dirname, '../../fixture'));
  expect(
    fs.readFileSync(path.resolve(__dirname, '../../fixture/node_modules/remix-routes.d.ts'), 'utf8'),
  ).toMatchSnapshot();
});
