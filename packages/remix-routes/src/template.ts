export const template = `declare module "remix-routes" {
  type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
  // symbol won't be a key of SearchParams
  type IsSearchParams<T> = symbol extends keyof T ? false : true;
  <% if (strictMode) { %>
    type ExportedQuery<T> = IsSearchParams<T> extends true ? T : never;
  <% } else { %>
    type ExportedQuery<T> = IsSearchParams<T> extends true ? T : URLSearchParamsInit;
  <% } %>

  export interface Routes {
  <% routes.forEach(({ route, params, fileName }) => { %>
    "<%- route %>": {
      params: {
      <% params.forEach(param => { %>
        <%- param %>: string | number;
      <% }) %>
      },
      query: ExportedQuery<import('../app/<%- fileName %>').SearchParams>,
    };
  <% }) %>
  }

  type RoutesWithParams = Pick<
    Routes,
    {
      [K in keyof Routes]: Routes[K]["params"] extends Record<string, never> ? never : K
    }[keyof Routes]
  >;

  export function $path<
    Route extends keyof Routes,
    Rest extends {
      params: Routes[Route]["params"];
      query?: Routes[Route]["query"];
    }
  >(
    ...args: Rest["params"] extends Record<string, never>
      ? [route: Route, query?: Rest["query"]]
      : [route: Route, params: Rest["params"], query?: Rest["query"]]
  ): string;

  export function $params<
    Route extends keyof RoutesWithParams,
    Params extends RoutesWithParams[Route]["params"]
  >(
      route: Route,
      params: { readonly [key: string]: string | undefined }
  ): {[K in keyof Params]: string};
}`;
