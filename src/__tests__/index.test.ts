import { $path, $params } from '../';

test('$path', () => {
  expect($path('/posts')).toBe('/posts');
});

test('$path + params', () => {
  expect($path('/posts/:id', { id: 1 })).toBe('/posts/1');
});

test('$path + query', () => {
  expect($path('/posts', { order: 'desc' })).toBe('/posts?order=desc');
});

test('$path + params + query', () => {
  expect($path('/posts/:id', { id: 1 }, { raw: 'true' })).toBe('/posts/1?raw=true');
});

test('$params', () => {
  expect($params('/posts/:id', { id: "1" })).toStrictEqual({ id: "1" });
});
