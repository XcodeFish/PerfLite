// src/plugins/index.ts

class PluginManager {
  constructor() {
    this.plugins = [];
  }

  registerPlugin(name, plugin) {
    this.plugins.push({ name, plugin });
  }

  getPlugins() {
    return this.plugins;
  }

  applyPlugins(data) {
    this.plugins.forEach(({ plugin }) => {
      if (typeof plugin.beforeSend === 'function') {
        plugin.beforeSend(data);
      }
    });
  }
}

const pluginManager = new PluginManager();

export { pluginManager, PluginManager };