import type * as Vite from 'vite';
interface PluginConfig {
  strict?: boolean;
  outDir?: string;
}

export declare function remixRoutes(pluginConfig: PluginConfig = {}): Vite.Plugin;
