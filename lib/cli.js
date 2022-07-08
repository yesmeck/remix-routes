#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const meow_1 = __importDefault(require("meow"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chokidar_1 = __importDefault(require("chokidar"));
const config_1 = require("@remix-run/dev/dist/config");
const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
`;
const cli = (0, meow_1.default)(helpText, {
    flags: {
        watch: {
            type: "boolean",
            alias: "w"
        }
    }
});
async function buildHelpers(remixRoot) {
    const config = await (0, config_1.readConfig)(remixRoot);
    const routesInfo = {};
    const handleRoutesRecursive = (parentId, parentPath = []) => {
        let routes = Object.values(config.routes).filter(route => route.parentId === parentId);
        routes.forEach(route => {
            let currentPath = parentPath;
            if (route.path) {
                currentPath = [...currentPath, route];
                const fullPath = currentPath.reduce((acc, curr) => [acc, curr.path].join('/'), '');
                const paramsNames = parse(currentPath);
                routesInfo[fullPath] = paramsNames;
            }
            handleRoutesRecursive(route.id, currentPath);
        });
    };
    handleRoutesRecursive();
    return routesInfo;
}
async function build(remixRoot) {
    const routesInfo = await buildHelpers(remixRoot);
    generate(routesInfo);
}
exports.build = build;
function watch(remixRoot) {
    build(remixRoot);
    chokidar_1.default.watch([path.join(remixRoot, 'app/routes/**/*.{ts,tsx}'), path.join(remixRoot, 'remix.config.js')]).on('change', () => {
        build(remixRoot);
    });
    console.log('Watching for routes changes...');
}
function generate(routesInfo) {
    const jsCode = generateHelpers(routesInfo);
    const tsCode = generateDefinition(routesInfo);
    const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
    fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode);
    fs.writeFileSync(path.join(outputPath, 'types.d.ts'), tsCode);
    fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
        "name": ".remix-routes",
        "main": "index.js",
    }));
}
function generateHelpers(routesInfo) {
    const routes = Object.entries(routesInfo).reduce((acc, [route, params]) => {
        if (params.length > 0) {
            acc[route] = params;
        }
        return acc;
    }, {});
    return `
const routes = ${JSON.stringify(routes, null, 2)};

module.exports = { routes }
`;
}
function generateDefinition(routesInfo) {
    const code = [];
    Object.entries({
        '/': [],
        ...routesInfo,
    }).forEach(([route, paramsNames]) => {
        const lines = ['export declare function $path('];
        lines.push(`  route: ${JSON.stringify(route)},`);
        if (paramsNames.length > 0) {
            const paramsType = paramsNames.map(paramName => `${paramName}: string | number`);
            lines.push(`  params: { ${paramsType.join('; ')} },`);
        }
        lines.push(`  query?: Record<string, string | number>`);
        lines.push(`): string;`);
        code.push(lines.join('\n'));
    });
    code.push('\n');
    return code.join('\n');
}
function parse(routes) {
    const paramNames = [];
    routes.forEach((route) => {
        var _a;
        if ((_a = route.path) === null || _a === void 0 ? void 0 : _a.startsWith(':')) {
            return paramNames.push(...route.path.split('/').map(param => param.replace(':', '')));
        }
        const [_, ...paramOrActions] = route.path.split('/');
        paramOrActions.forEach(paramOrAction => {
            if (paramOrAction.startsWith(':')) {
                paramNames.push(paramOrAction.replace(':', ''));
            }
        });
    });
    return paramNames;
}
if (require.main === module) {
    (async function () {
        const remixRoot = process.env.REMIX_ROOT || process.cwd();
        if (cli.flags.watch) {
            watch(remixRoot);
        }
        else {
            build(remixRoot);
        }
    })();
}
