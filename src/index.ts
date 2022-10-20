function extractParams(route: string) {
  return route
    .split('/')
    .filter((seg) => seg.indexOf(':') === 0)
    .map((seg) => seg.slice(1));
}

export function $path(route: string, ...paramsOrQuery: Array<any>) {
  const routeParams = extractParams(route);
  let path = route;
  let query:
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined = paramsOrQuery[0];

  if (routeParams.length > 0) {
    const params: any = paramsOrQuery[0];
    query = paramsOrQuery[1];
    routeParams.forEach((name) => {
      path = path.replace(':' + name, params[name]);
    });
  }

  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams(query);

  return path + '?' + searchParams.toString();
}

export function $params(
  _route: string,
  params: { readonly [key: string]: string | undefined },
) {
  return params;
}
