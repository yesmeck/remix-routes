# remix-routes

`remix-routes` automatically generates typesafe helper functions for manipulating internal links in your Remix apps.

https://user-images.githubusercontent.com/465125/205243864-3493733d-8586-405f-94eb-088fdb87fd23.mp4

## Installation

```bash
$ npm add remix-routes
```

## Setup

Add `remix-routes` to your dev and build script in `package.json`.

**With [`concurrently`](https://www.npmjs.com/package/concurrently) package:**

```json
{
  "scripts": {
    "build": "remix-routes && remix build",
    "dev": "concurrently \"remix-routes -w\" \"remix dev\""
  }
}
```

**With [`npm-run-all`](https://www.npmjs.com/package/npm-run-all) package:**

```json
{
  "scripts": {
    "build": "run-s build:*",
    "build:routes": "remix-routes",
    "dev": "run-p dev:*",
    "dev:routes": "remix-routes -w",
  }
}
```

## Usage

### Basic usage

```typescript
import type { ActionFunction } from 'remix';
import { redirect } from 'remix';
import { $path } from 'remix-routes'; // <-- Import magical $path helper from remix-routes.

export const action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  const post = await createPost(formData);

  return redirect($path('/posts/:id', { id: post.id })); // <-- It's type safe.
};
```

### Appending query string:

```typescript
import { $path } from 'remix-routes';

$path('/posts/:id', { id: 6 }, { version: 18 }); // => /posts/6?version=18
$path('/posts', { limit: 10 }); // => /posts?limit=10
// You can pass any URLSearchParams init as param
$path('/posts/delete', [['id', 1], ['id', 2]]); // => /posts/delete?id=1&id=2
```

### Typed query string:

Define type of query string by exporting a type named `SearchParams` in route file:

```typescript
// app/routes/posts.tsx

export type SearchParams = {
  view: 'list' | 'grid',
  sort?: 'date' | 'views',
  page?: number,
}
```

```typescript
import { $path } from 'remix-routes';

// The query string is type-safe.
$path('/posts', { view: 'list', sort: 'date', page: 1 });
```

You can combine this feature with [zod](https://github.com/colinhacks/zod) and [remix-params-helper](https://github.com/kiliman/remix-params-helper) to add runtime params checking:

```typescript
import { z } from "zod";
import { getSearchParams } from "remix-params-helper";

const SearchParamsSchema = z.object({
  view: z.enum(["list", "grid"]),
  sort: z.enum(["price", "size"]).optional(),
  page: z.number().int().optional(),
})

export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const loader = async (request) => {
  const result = getSearchParams(request, SearchParamsSchema)
  if (!result.success) {
    return json(result.errors, { status: 400 })
  }
  const { view, sort, page } = result.data;
}
```

### Checking params:

```typescript
import type { ActionFunction } from 'remix';
import { $params } from 'remix-routes'; // <-- Import $params helper.

export const action: ActionFunction = async ({ params }) => {
  const { id } = $params("/posts/:id/update", params) // <-- It's type safe, try renaming `id` param.

  // ...
}
```

### Route type definitions

remix-routes also export all route type definitions for your convenience.

```typescript
import type { Routes } from 'remix-routes';
import { useParams } from "remix";

export default function Component() {
  const { id } = useParams<Routes['/posts/:id']['params']>();
  ...
}
```

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.
- `-o`: Specify the output path for `remix-routes.d.ts`. Defaults to `./node_modules` if arg is not given.

## Recipes

Here are a few recipes and patterns that can be useful for your project:

### Typed Redirect Function

```ts
import { redirect as remixRedirect } from "@remix-run/node";

export const redirect = <
  Route extends keyof Routes,
  Rest extends {
    params: Routes[Route]["params"];
    query?: Routes[Route]["query"];
  }
>(
  ...args: Rest["params"] extends Record<string, never>
    ? [route: Route, query?: Rest["query"]]
    : [route: Route, params: Rest["params"], query?: Rest["query"]]
) => {
  return $path(args as any);
}
```

### Function Args for $route

```ts
type RouteFunction = <
  Route extends keyof Routes,
  Rest extends {
    params: Routes[Route]["params"];
    query?: Routes[Route]["query"];
  }
>(
  ...args: Rest["params"] extends Record<string, never>
    ? [route: Route, query?: Rest["query"]]
    : [route: Route, params: Rest["params"], query?: Rest["query"]]
) => any;

// Example usage:
export const route = ((...args) => {
  return $path(args as any);
}) satisfies RouteFunction;
```

## TypeScript Integration

A TypeScript plugin is available to help you navigate between route files.

### Installation

```bash
$ npm add -D typescript-remix-routes-plugin
```

### Setup

Add the plugin to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "typescript-remix-routes-plugin"
      }
    ]
  }
}
```

Select workspace version of TypeScript in VSCode:

<img width="685" alt="Screenshot 2022-12-02 at 5 56 39 pm" src="https://user-images.githubusercontent.com/465125/205244385-e8051e71-1fda-417a-80a5-107f551d4bcf.png">


## License

[MIT](LICENSE)
