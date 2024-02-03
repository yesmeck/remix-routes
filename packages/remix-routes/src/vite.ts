import type * as Vite from 'vite';
import { DEFAULT_OUTPUT_DIR_PATH, build } from './build';

interface PluginConfig {
  strict?: boolean;
  outputDirPath?: string;
}

const RemixPluginContextName = '__remixPluginContext';

export function remixRoutes(pluginConfig: PluginConfig = {}): Vite.Plugin {
  let remixPlugin: any;
  let rootDirectory: string
  let viteUserConfig: Vite.UserConfig;
  let viteConfigEnv: Vite.ConfigEnv;
  let ctx: any;

  function generateTypeFile() {
    if (!ctx) {
      return;
    }
    build(rootDirectory, ctx.remixConfig, { strict: pluginConfig.strict, outputDirPath: pluginConfig.outputDirPath || DEFAULT_OUTPUT_DIR_PATH });
  }

  async function reloadCtx() {
    const config = await remixPlugin.config(viteUserConfig, viteConfigEnv);
    ctx = (config as any)[RemixPluginContextName];
  }

  return {
    name: 'remix-routes',
    enforce: 'post',
    config(_viteUserConfig, _viteConfigEnv) {
      viteUserConfig = _viteUserConfig;
      viteConfigEnv = _viteConfigEnv;
    },
    configResolved(config) {
      remixPlugin = config.plugins.find((plugin) => plugin.name === 'remix');
      if (!remixPlugin) {
        return;
      }
      rootDirectory = config.root;
      ctx = (config as any)[RemixPluginContextName];
      generateTypeFile();
    },
    async watchChange(id, change) {
      if (!remixPlugin) {
        return;
      }
      if (change.event === 'update') {
        return;
      }
      await reloadCtx();
      generateTypeFile();
    },
  }
}
