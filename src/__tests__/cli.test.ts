import { build } from '../cli';
import * as path from 'path';
import * as fs from 'fs';

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
