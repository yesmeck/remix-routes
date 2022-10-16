import * as path from 'path';
import { build } from '../cli';

describe('helper', () => {
  let $path: any, $params: any;

  beforeAll(async () => {
    await build(path.resolve(__dirname, '../../fixture'));
    $path = require('remix-routes').$path;
    $params = require('remix-routes').$params;
  });

  test('$path', () => {
    expect($path('/posts')).toBe('/posts');
  });

  test('$path + params', () => {
    expect($path('/posts/:id', { id: 1 })).toBe('/posts/1');
  });

  test('$path + query', () => {
    expect($path('/posts', { order: 'desc' })).toBe('/posts?order=desc');
  });

  test('$path + array query', () => {
    expect(
      $path('/posts/delete', [
        ['id', '1'],
        ['id', '2'],
      ]),
    ).toBe('/posts/delete?id=1&id=2');
  });

  test('$path + params + query', () => {
    expect($path('/posts/:id', { id: 1 }, { raw: 'true' })).toBe(
      '/posts/1?raw=true',
    );
  });

  test('$params', () => {
    expect($params('/posts/:id', { id: '1' })).toStrictEqual({ id: '1' });
  });
});
