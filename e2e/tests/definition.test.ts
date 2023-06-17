import { expect, test } from 'vitest';
import * as path from 'path';
import { createServer, findResponse } from './language-server';
import stripIndent from 'strip-indent';

test('definition', async () => {
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
    command: 'definitionAndBoundSpan',
    arguments: { file, offset: 10, line: 3 },
  });
  await server.waitResponse('definitionAndBoundSpan');
  await server.close();
  const response = findResponse(server.responses, 'definitionAndBoundSpan');
  response.body.definitions.forEach((def: any) => def.file = 'Any(string)')
  expect(response.body).toMatchInlineSnapshot(`
    {
      "definitions": [],
      "textSpan": {
        "end": {
          "line": 1,
          "offset": 1,
        },
        "start": {
          "line": 1,
          "offset": 1,
        },
      },
    }
  `);
});
