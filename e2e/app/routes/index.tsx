import { $params, $path } from 'remix-routes';

import { Routes } from 'remix-routes';
import { redirect as remixRedirect } from "@remix-run/node";

function redirect<
  R extends keyof Routes,
  P extends Routes[R]["params"],
  Q extends Routes[R]["query"]
>(route: R, params: P, query?: Q) {
  const includeParams = route.indexOf('/:') > -1;
  return remixRedirect(
      includeParams ? $path(route as any, params as any, query as any) : $path(route as any, query as any)
  );
}

redirect("/posts/:id", { id: 1 }, { view: "list", sort: "price" });

$path('/posts/:id', { id: 1 }, { view: 'list', sort: 'price' });

$path('/', { foo: 'bar' });
