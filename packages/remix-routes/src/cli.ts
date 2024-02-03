#!/usr/bin/env node
import meow from 'meow';
import { DEFAULT_OUTPUT_DIR_PATH, build, watch } from './build';

let readConfig: typeof import('@remix-run/dev/dist/config').readConfig;

try {
  readConfig = require('@remix-run/dev/config').readConfig;
} catch (e) {
  try {
    readConfig = require('@remix-run/dev/dist/config').readConfig;
  } catch (e) {
    readConfig = require('@vercel/remix-run-dev/dist/config').readConfig;
  }
}

const helpText = `
Usage
$ remix-routes

Options
--watch, -w  Watch for routes changes
--strict, -s  Enable strict mode
--outputDirPath, -o Specify the output path for "remix-routes.d.ts". Defaults to "./node_modules" if arg is not given.
`;


const cli = meow(helpText, {
  flags: {
    watch: {
      type: 'boolean',
      alias: 'w',
    },
    strict: {
      type: 'boolean',
      alias: 's',
    },
    outputDirPath: {
      type: 'string',
      alias: 'o',
      default: DEFAULT_OUTPUT_DIR_PATH,
    }
  },
});

if (require.main === module) {
  (async function () {
    const remixRoot = process.env.REMIX_ROOT ?? process.cwd();
    const remixConfig = await readConfig(remixRoot);

    if (cli.flags.watch) {
      watch(remixRoot, remixConfig, { strict: cli.flags.strict, outputDirPath: cli.flags.outputDirPath });
    } else {
      build(remixRoot, remixConfig, { strict: cli.flags.strict, outputDirPath: cli.flags.outputDirPath });
    }
  })();
}
