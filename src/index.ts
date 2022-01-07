import { routes } from '.remix-routes';

export function $path(route: string, ...paramsOrQuery: Array<object>) {
  const routeParams = routes[route];
  let path = route;
  let query = paramsOrQuery[0];

  if (routeParams?.length > 0) {
    const params: any = paramsOrQuery[0];
    query = paramsOrQuery[1];
    routeParams.forEach((name) => {
      path = path.replace(':' + name, params[name]);
    })
  }

  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams('');

  Object.entries(query).forEach(([key, value]) => {
    searchParams.append(key, value);
  });

  return path + '?' + searchParams.toString();
}
