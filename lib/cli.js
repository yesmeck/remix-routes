var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import meow from 'meow';
import { camelCase } from 'camel-case';
import { readConfig } from '@remix-run/dev/config.js';
import * as fs from 'fs';
import * as path from 'path';
const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
`;
const cli = meow(helpText, {
    importMeta: import.meta,
    flags: {
        watch: {
            type: "boolean",
            alias: "w"
        }
    }
});
function build(flags) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield readConfig();
        const paths = [];
        const handleRoutesRecursive = (parentId, parentPath = '') => {
            let routes = Object.values(config.routes).filter(route => route.parentId === parentId);
            routes.forEach(route => {
                let currentPath = parentPath;
                if (route.path) {
                    currentPath = [currentPath, route.path].join('/');
                    const [segments, paramsNames] = parse(currentPath);
                    paths.push({
                        segments,
                        paramsNames,
                        fullPath: currentPath,
                    });
                }
                handleRoutesRecursive(route.id, currentPath);
            });
        };
        handleRoutesRecursive();
        generate(paths);
    });
}
function generate(paths) {
    const jsCode = [];
    const tsCode = [];
    paths.forEach(path => {
        const functionName = camelCase([...path.segments, 'path'].join('_'));
        jsCode.push(generateHelpers(functionName, path.paramsNames, path.fullPath));
        tsCode.push(generateDefinition(functionName, path.paramsNames));
    });
    const outputPath = path.join(process.cwd(), 'node_modules', '.remix-routes');
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
    fs.writeFileSync(path.join(outputPath, 'index.js'), jsCode.join('\n'));
    fs.writeFileSync(path.join(outputPath, 'index.d.ts'), tsCode.join('\n'));
    fs.writeFileSync(path.join(outputPath, 'package.json'), JSON.stringify({
        "name": ".remix-routes",
        "main": "index.js",
        "types": "index.d.ts"
    }));
}
function generateHelpers(functionName, paramNames, originalPath) {
    return `export function ${functionName}(${paramNames.join(', ')}) {
  return ${originalPath.split('/').filter(Boolean).map(segment => {
        if (segment.startsWith(':')) {
            return `'/' + ${segment.slice(1)}`;
        }
        return `'/${segment}'`;
    }).join(' + ')};
}`;
}
function generateDefinition(functionName, paramNames) {
    const typedParams = paramNames.map(paramName => `${paramName}: string | number`);
    return `export declare function ${functionName}(${typedParams.join(', ')}): string;`;
}
function parse(path) {
    const segments = [];
    const paramNames = [];
    path.split('/').forEach(segment => {
        if (segment.startsWith(':')) {
            const paramName = segment.slice(1);
            segments.push(paramName);
            paramNames.push(paramName);
        }
        else {
            segments.push(segment);
        }
    });
    return [segments, paramNames];
}
build(cli.flags);
