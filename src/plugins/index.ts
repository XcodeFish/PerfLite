import { Plugin } from '@/types';

interface PluginEntry {
  name: string;
  plugin: Plugin;
}

class PluginManager {
  private plugins: PluginEntry[] = [];

  constructor() {
    // 初始化插件列表
  }

  registerPlugin(name: string, plugin: Plugin): void {
    this.plugins.push({ name, plugin });
  }

  getPlugins(): PluginEntry[] {
    return this.plugins;
  }

  applyPlugins(data: unknown): void {
    this.plugins.forEach(({ plugin }) => {
      if (typeof plugin.beforeSend === 'function') {
        plugin.beforeSend(data);
      }
    });
  }
}

const pluginManager = new PluginManager();

export { pluginManager, PluginManager };
