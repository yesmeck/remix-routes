import { expectTypeOf, test } from 'vitest';
import { $params, $path, Routes } from "remix-routes";

type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;

test('$path', () => {
  expectTypeOf($path('/')).toEqualTypeOf<string>();
  expectTypeOf($path('/', { foo: "bar" })).toEqualTypeOf<string>();
  expectTypeOf($path('/posts')).toEqualTypeOf<string>();
  expectTypeOf($path('/posts', { foo: "bar" })).toEqualTypeOf<string>();
  expectTypeOf($path('/posts/:id', { id: 1 }, { view: "list", sort: 'price' })).toEqualTypeOf<string>();
  expectTypeOf($path('/:lang?/about', { lang: "en" })).toEqualTypeOf<string>();
  expectTypeOf($path('/admin')).toEqualTypeOf<string>();
  expectTypeOf($path('/admin', { foo: "bar" })).toEqualTypeOf<string>();
});

test('$prams', () => {
  let params: any = {};
  expectTypeOf($params('/posts/:id', params)).toEqualTypeOf<{ id: string }>();
  expectTypeOf($params('/:lang?/about', params)).toEqualTypeOf<{ lang?: string }>();
});

test('Routes', () => {
  expectTypeOf<Routes['/']>().toMatchTypeOf<{
    params: {},
    query: URLSearchParamsInit,
  }>();

  expectTypeOf<Routes['/:lang?/about']>().toMatchTypeOf<{
    params: { lang?: string | number },
    query: URLSearchParamsInit,
  }>();

  expectTypeOf<Routes['/posts']>().toMatchTypeOf<{
    params: {},
    query: URLSearchParamsInit,
  }>();

  expectTypeOf<Routes['/posts/:id']>().toEqualTypeOf<{
    params: { id: string | number },
    query: {
      view: 'list' | 'grid';
      sort?: 'price' | 'size';
    },
  }>();
});
