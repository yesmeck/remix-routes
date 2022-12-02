# typescript-remix-plugin

TypeScript language server plugin that adds intellisense to your Remix projects.

## Features

- [Route path completion](#route-path-completion)
- [Route path diagnostics](#route-path-diagnostics)
- [Jump to route definition](#jump-to-route-definition)
- [Route module completion](#route-module-completion)
- Jump to route reference
- 🚧 Rename route

## Get Started

```bash
$ npm install typescript-remix-plugin -D
```

And configure plugins section in your `tsconfig.json`, for example:

```json
{
  "compilerOptions": {
    "target": "ES2019",
    "plugins": [
      {
        "name": "typescript-remix-plugin",
        "tag": "route"
      }
    ]
  }
}
```

## Route path completion

```ts
// import name should be the same as the tag name in the `tsconfig.json`
import route from 'typescript-remix-plugin/tag';

const id = 1;

route`/posts/${id}`;
```

![Route path completion](./assets/route-path-completion.gif)

## Route path diagnostics

![Route path diagnostics](./assets/route-path-diagnostics.gif)

## Jump to route definition

![Jump to route definition](./assets/jump-to-route-definition.gif)

## Route module completion

![Route module completion](./assets/route-module-completion.gif)

## License

[MIT](/LICENSE)
