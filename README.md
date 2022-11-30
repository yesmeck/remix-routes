# remix-routes

`remix-routes` automatically generates typesafe helper functions for manipulating internal links in your Remix apps.

![Screenshot](https://user-images.githubusercontent.com/465125/147367217-0b8e8a04-0152-48e8-ba65-32c34605a4a5.png)

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

Appending query string:

```typescript
import { $path } from 'remix-routes';

$path('/posts/:id', { id: 6 }, { version: 18 }); // => /posts/6?version=18
$path('/posts', { limit: 10 }); // => /posts?limit=10
// You can pass any URLSearchParams init as param
$path('/posts/delete', [['id', 1], ['id', 2]]); // => /posts/delete?id=1&id=2
```

Checking params:

```typescript
import type { ActionFunction } from 'remix';
import { $params } from 'remix-routes'; // <-- Import $params helper.

export const action: ActionFunction = async ({ params }) => {
  const { id } = $params("/posts/:id/update", params) // <-- It's type safe, try renaming `id` param.

  // ...
}
```

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.

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

## License

[MIT](LICENSE)
