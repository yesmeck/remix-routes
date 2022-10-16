// __routes__

module.exports.$path = function $path(route, ...paramsOrQuery) {
  const routeParams = routes[route];
  let path = route;
  let query = paramsOrQuery[0];
  if (
    (routeParams === null || routeParams === void 0
      ? void 0
      : routeParams.length) > 0
  ) {
    const params = paramsOrQuery[0];
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

module.exports.$params = function $params(_route, params) {
  return params;
}
