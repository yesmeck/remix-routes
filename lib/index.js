"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$path = void 0;
const _remix_routes_1 = require(".remix-routes");
function $path(route, ...paramsOrQuery) {
    const routeParams = _remix_routes_1.routes[route];
    let path = route;
    let query = paramsOrQuery[0];
    if ((routeParams === null || routeParams === void 0 ? void 0 : routeParams.length) > 0) {
        const params = paramsOrQuery[0];
        query = paramsOrQuery[1];
        routeParams.forEach((name) => {
            path = path.replace(':' + name, params[name]);
        });
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
exports.$path = $path;
