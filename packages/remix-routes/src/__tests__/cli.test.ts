import { test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { build } from '../cli';

test('build', async () => {
  await build(path.resolve(__dirname, '../../fixture'));
  const outputPath = path.resolve(__dirname, '../../node_modules');
  fs.readdirSync(outputPath).forEach((file) => {
    if (file.startsWith('remix-routes')) {
      expect(
        fs.readFileSync(path.resolve(outputPath, file), 'utf8'),
      ).toMatchSnapshot();
    }
  });
});
