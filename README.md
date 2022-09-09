# remix-routes

`remix-routes` automatically generates typesafe helper functions for manipulating internal links in your Remix apps.

![Screenshot](https://user-images.githubusercontent.com/465125/147367217-0b8e8a04-0152-48e8-ba65-32c34605a4a5.png)

## Installation

- Using pnpm:

```bash
$ pnpm add remix-routes
```

- Using yarn:

```bash
$ yarn add remix-routes
```

- Using npm:

```bash
$ npm add remix-routes
```

## Setup

`package.json`

```json
{
  "scripts": {
    "build": "remix-routes && remix build",
    "dev": "concurrently \"remix-routes -w\" \"remix dev\""
  }
}
```

## Usage

```typescript
import type { ActionFunction } from 'remix';
import { redirect } from 'remix';
import { $path } from 'remix-routes'; // <-- Import magic $path helper from remix-routes.

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

## API

- `$path(path: string, params: { [key: string]: string | number }, query?: { [key: string]: string | number })`
- `$path(path: string, query?: { [key: string]: string | number })`
- `$params(path: string, params: { readonly [key: string]: string | undefined })`

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.

## License

[MIT](LICENSE)
