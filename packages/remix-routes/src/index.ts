function includesParams(route: string) {
  return route.indexOf('/:') > -1 || route.indexOf('/*') > -1;
}

export function $path(route: string, ...paramsOrQuery: Array<any>) {
  let path = route;
  let query:
    | string
    | string[][]
    | Record<string, string>
    | URLSearchParams
    | undefined = paramsOrQuery[0];

  if (includesParams(route)) {
    const params: any = paramsOrQuery[0] ?? {};
    query = paramsOrQuery[1];
    path = route.split('/').map(fragment => {
      if (fragment.indexOf(':') > -1) {
        let paramName = fragment.slice(1);
        if (paramName.indexOf('?') > -1) {
          paramName = paramName.slice(0, -1);
        }
        if (paramName in params) {
          return params[paramName];
        }
        return null
      }
      if (fragment == "*") {
        if ("*" in params) {
          return params["*"];
        }
        return null;
      }
      return fragment;
    }).filter(f => f !== null).join('/');
  }

  if (!query) return path;

  if (Array.isArray(query)) {
    query = query.filter(([, value]) => value !== undefined && value !== null);
  } else if (typeof query === 'object') {
    query = Object.fromEntries(
      Object.entries(query).filter(
        ([, value]) => value !== undefined && value !== null
      )
    );
  }
  if (Object.keys(query).length === 0) return path;
  const searchParams = new URLSearchParams(query);
  return path + '?' + searchParams.toString();
}

export function $params(
  _route: string,
  params: { readonly [key: string]: string | undefined },
) {
  return params;
}
