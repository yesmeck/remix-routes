# remix-routes

`remix-routes` automatically generates type definition files for manipulating internal links in your Remix apps.

## Installation

- Using pnpm:

```bash
$ yanr add remix-routes
```

- Using yarn:

```bash
$ yanr add remix-routes
```

- Using npm:

```bash
$ npm add remix-routes
```

## Setup

`package.json`

```json
{
  // ...
  "scripts": {
    "build": "remix-routes && remix build",
    "dev": "concurrently \"remix-routes -w\" \"remix dev\""
  }
  // ...
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

## API

- `$path(path: string, params: { [key: string]: string | number }, query?: { [key: string]: string | number })`
- `$path(path: string, query?: { [key: string]: string | number })`

## Command Line Options

- `-w`: Watch for changes and automatically rebuild.

## License

[MIT](LICENSE)
