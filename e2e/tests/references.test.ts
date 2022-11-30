import { expect, test } from 'vitest';
import * as path from 'path';
import { createServer, findResponse } from './language-server';
import stripIndent from 'strip-indent';

test.skip('references', async () => {
  const server = createServer();
  const file = path.resolve(__dirname, '../app/routes/posts.tsx');

  const fileContent = stripIndent(`
    import route from 'typescript-remix-plugin/tag';
    export default () => {};
    route\`/posts\`;
  `).trim();

  server.send({
    command: 'open',
    arguments: { file, fileContent, scriptKindName: 'TS' },
  });
  await server.waitEvent('projectLoadingFinish');
  server.send({
    command: 'references',
    arguments: { file, offset: 10, line: 2 },
  });
  await server.waitResponse('references');
  await server.close();
  const response = findResponse(server.responses, 'references');
  expect(response.body).toMatchInlineSnapshot('');
});
