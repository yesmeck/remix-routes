import { expect, test } from 'vitest';
import * as path from 'path';
import { createServer, findResponse } from './language-server';
import stripIndent from 'strip-indent';

test('quickinfo', async () => {
  const server = createServer();
  const file = path.resolve(__dirname, '../app/routes/index.tsx');
  const fileContent = stripIndent(`
    import { $path } from 'typescript-remix-plugin/helper;

    $path('/posts');
  `).trim();

  server.send({
    command: 'open',
    arguments: { file, fileContent, scriptKindName: 'TS' },
  });
  await server.waitEvent('projectLoadingFinish');
  server.send({
    command: 'quickinfo',
    arguments: { file, offset: 10, line: 3 },
  });
  await server.waitResponse('quickinfo');
  await server.close();
  const response = findResponse(server.responses, 'quickinfo');
  expect(response.body.displayString).toMatchInlineSnapshot('"(remix) file: ~/app/routes/posts/index.tsx"');
});


test('multiple route files', async () => {
  const server = createServer();
  const file = path.resolve(__dirname, '../app/routes/index.tsx');
  const fileContent = stripIndent(`
    import { $path } from 'typescript-remix-plugin/helper;

    $path('/');
  `).trim();

  server.send({
    command: 'open',
    arguments: { file, fileContent, scriptKindName: 'TS' },
  });
  await server.waitEvent('projectLoadingFinish');
  server.send({
    command: 'quickinfo',
    arguments: { file, offset: 8, line: 3 },
  });
  await server.waitResponse('quickinfo');
  await server.close();
  const response = findResponse(server.responses, 'quickinfo');
  expect(response.body.displayString).toMatchInlineSnapshot('"(remix) file: ~/app/routes/index.tsx"');
});
