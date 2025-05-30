import { IPlugin, IPluginHooks, IPluginManager } from '@/types/plugin';
import { BasePlugin } from './interface';

/**
 * 插件管理器
 * 负责插件的注册、卸载、启用、禁用和生命周期管理
 */
class PluginManager implements IPluginManager {
  private plugins: Map<string, IPlugin> = new Map();
  private apis: Map<string, Record<string, unknown>> = new Map();
  private sortedPlugins: IPlugin[] = [];
  private dependencyResolved: boolean = false;

  /**
   * 注册插件
   * @param name 插件名称
   * @param plugin 插件实例或钩子对象
   * @returns 是否注册成功
   */
  public register(name: string, plugin: IPlugin | IPluginHooks): boolean {
    if (this.plugins.has(name)) {
      console.warn(`Plugin ${name} already registered.`);
      return false;
    }

    let pluginInstance: IPlugin;

    if (this.isPluginHooks(plugin)) {
      // 如果是钩子对象，创建一个默认的插件实例
      pluginInstance = new DefaultPlugin(name, '1.0.0', plugin);
    } else {
      pluginInstance = plugin;
    }

    this.plugins.set(name, pluginInstance);
    this.dependencyResolved = false; // 重置依赖解析状态

    // 注册插件API
    const api = pluginInstance.getApi();
    if (Object.keys(api).length > 0) {
      this.registerApi(name, api);
    }

    return true;
  }

  /**
   * 卸载插件
   * @param name 插件名称
   * @returns 是否卸载成功
   */
  public unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // 检查是否有其他插件依赖于此插件
    const dependents = this.findDependents(name);
    if (dependents.length > 0) {
      console.warn(`Cannot unregister plugin ${name}, it is required by: ${dependents.join(', ')}`);
      return false;
    }

    plugin.destroy().catch((e) => console.error(`Error destroying plugin ${name}:`, e));
    this.plugins.delete(name);
    this.apis.delete(name);
    this.dependencyResolved = false; // 重置依赖解析状态

    return true;
  }

  /**
   * 获取插件
   * @param name 插件名称
   * @returns 插件实例或null
   */
  public getPlugin(name: string): IPlugin | null {
    return this.plugins.get(name) || null;
  }

  /**
   * 获取所有插件
   * @returns 插件实例数组
   */
  public getAllPlugins(): IPlugin[] {
    if (!this.dependencyResolved) {
      this.resolveDependencyGraph();
    }
    return this.sortedPlugins;
  }

  /**
   * 启用插件
   * @param name 插件名称
   * @returns 是否启用成功
   */
  public enablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    plugin.enable();
    return true;
  }

  /**
   * 禁用插件
   * @param name 插件名称
   * @returns 是否禁用成功
   */
  public disablePlugin(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return false;
    }

    // 检查是否有启用的插件依赖于此插件
    const dependents = this.findEnabledDependents(name);
    if (dependents.length > 0) {
      console.warn(
        `Cannot disable plugin ${name}, it is required by enabled plugins: ${dependents.join(', ')}`
      );
      return false;
    }

    plugin.disable();
    return true;
  }

  /**
   * 应用插件钩子
   * @param hookName 钩子名称
   * @param data 输入数据
   * @returns 处理后的数据或false
   */
  public async applyHook<T>(hookName: keyof IPluginHooks, data: T): Promise<T | false> {
    if (!this.dependencyResolved) {
      this.resolveDependencyGraph();
    }

    let result: T | false = data;

    for (const plugin of this.sortedPlugins) {
      if (!plugin.isEnabled()) continue;

      const hook = plugin.hooks[hookName];
      if (typeof hook === 'function') {
        try {
          // 使用类型安全的方式调用函数
          // 由于钩子类型复杂，这里使用any断言是最合理的处理方式
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const hookResult = await Promise.resolve((hook as any)(result));
          if (hookResult === false) {
            return false;
          } else if (hookResult !== undefined) {
            result = hookResult as T;
          }
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} hook ${String(hookName)}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * 注册API
   * @param name 插件名称
   * @param api API对象
   * @returns 是否注册成功
   */
  public registerApi(name: string, api: Record<string, unknown>): boolean {
    if (this.apis.has(name)) {
      const existingApi = this.apis.get(name)!;
      this.apis.set(name, { ...existingApi, ...api });
    } else {
      this.apis.set(name, { ...api });
    }
    return true;
  }

  /**
   * 获取API
   * @param name 插件名称
   * @returns API对象或null
   */
  public getApi(name: string): Record<string, unknown> | null {
    return this.apis.get(name) || null;
  }

  /**
   * 加载插件
   * @param url 插件URL
   * @returns 是否加载成功
   */
  public async loadPlugin(url: string): Promise<boolean> {
    try {
      // 动态加载插件模块
      const module = await import(/* @vite-ignore */ url);
      const plugin = module.default || module;

      if (!this.isPluginInstance(plugin)) {
        console.error(`Invalid plugin format from ${url}`);
        return false;
      }

      return this.register(plugin.name, plugin);
    } catch (error) {
      console.error(`Failed to load plugin from ${url}:`, error);
      return false;
    }
  }

  /**
   * 安装插件
   * @param plugin 插件实例
   * @returns 是否安装成功
   */
  public async installPlugin(plugin: IPlugin): Promise<boolean> {
    if (!this.register(plugin.name, plugin)) {
      return false;
    }

    try {
      await plugin.init();
      return true;
    } catch (error) {
      console.error(`Failed to initialize plugin ${plugin.name}:`, error);
      this.unregister(plugin.name);
      return false;
    }
  }

  /**
   * 获取插件依赖
   * @param name 插件名称
   * @returns 依赖插件名称数组
   */
  public getDependencies(name: string): string[] {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return [];
    }
    return plugin.config.dependencies || [];
  }

  /**
   * 按类别获取插件
   * @param category 类别名称
   * @returns 插件实例数组
   */
  public getPluginsByCategory(category: string): IPlugin[] {
    return Array.from(this.plugins.values()).filter(
      (plugin) => plugin.metadata?.category === category
    );
  }

  /**
   * 按标签获取插件
   * @param tag 标签名称
   * @returns 插件实例数组
   */
  public getPluginsByTag(tag: string): IPlugin[] {
    return Array.from(this.plugins.values()).filter((plugin) =>
      plugin.metadata?.tags?.includes(tag)
    );
  }

  /**
   * 解析依赖图
   * @returns 是否解析成功
   */
  public resolveDependencyGraph(): boolean {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: IPlugin[] = [];

    // 深度优先搜索
    const visit = (name: string): boolean => {
      if (temp.has(name)) {
        // 检测到循环依赖
        console.error(`Circular dependency detected: ${Array.from(temp).join(' -> ')} -> ${name}`);
        return false;
      }

      if (visited.has(name)) {
        return true;
      }

      const plugin = this.plugins.get(name);
      if (!plugin) {
        return true;
      }

      temp.add(name);

      // 处理依赖
      const dependencies = this.getDependencies(name);
      for (const dep of dependencies) {
        if (!this.plugins.has(dep)) {
          console.warn(`Plugin ${name} depends on non-existent plugin ${dep}`);
          continue;
        }

        if (!visit(dep)) {
          return false;
        }
      }

      temp.delete(name);
      visited.add(name);
      order.push(plugin);
      return true;
    };

    // 对所有插件进行排序
    for (const name of this.plugins.keys()) {
      if (!visited.has(name)) {
        if (!visit(name)) {
          return false;
        }
      }
    }

    // 按优先级再次排序
    this.sortedPlugins = order.sort((a, b) => {
      const priorityA = a.config.priority || 0;
      const priorityB = b.config.priority || 0;
      return priorityB - priorityA; // 高优先级在前
    });

    this.dependencyResolved = true;
    return true;
  }

  /**
   * 发出事件
   * @param eventName 事件名称
   * @param data 事件数据
   */
  public emitEvent(eventName: string, data: unknown): void {
    this.plugins.forEach((plugin) => {
      if (plugin.isEnabled()) {
        plugin.emit(eventName, data);
      }
    });
  }

  /**
   * 订阅事件
   * @param eventName 事件名称
   * @param handler 事件处理函数
   * @returns 取消订阅函数
   */
  public subscribeToEvent(eventName: string, handler: (data: unknown) => void): () => void {
    const unsubscribers: Array<() => void> = [];

    this.plugins.forEach((plugin) => {
      if (plugin.isEnabled()) {
        unsubscribers.push(plugin.on(eventName, handler));
      }
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }

  /**
   * 查找依赖某个插件的插件
   * @param name 插件名称
   * @returns 依赖插件名称数组
   */
  private findDependents(name: string): string[] {
    return Array.from(this.plugins.entries())
      .filter(([, plugin]) => plugin.config.dependencies?.includes(name))
      .map(([pluginName]) => pluginName);
  }

  /**
   * 查找启用状态下依赖某个插件的插件
   * @param name 插件名称
   * @returns 依赖插件名称数组
   */
  private findEnabledDependents(name: string): string[] {
    return Array.from(this.plugins.entries())
      .filter(([, plugin]) => plugin.isEnabled() && plugin.config.dependencies?.includes(name))
      .map(([pluginName]) => pluginName);
  }

  /**
   * 检查对象是否为插件钩子
   * @param obj 待检查对象
   * @returns 是否为插件钩子
   */
  private isPluginHooks(obj: any): obj is IPluginHooks {
    return (
      obj &&
      typeof obj === 'object' &&
      (typeof obj.init === 'function' ||
        typeof obj.beforeSend === 'function' ||
        typeof obj.afterSend === 'function' ||
        typeof obj.destroy === 'function')
    );
  }

  /**
   * 检查对象是否为插件实例
   * @param obj 待检查对象
   * @returns 是否为插件实例
   */
  private isPluginInstance(obj: any): obj is IPlugin {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string' &&
      typeof obj.hooks === 'object' &&
      typeof obj.init === 'function' &&
      typeof obj.isEnabled === 'function'
    );
  }
}

/**
 * 默认插件实现
 * 用于将插件钩子对象转换为完整的插件实例
 */
class DefaultPlugin extends BasePlugin {
  constructor(name: string, version: string, hooks: IPluginHooks) {
    super(name, version, hooks);
  }
}

// 创建插件管理器单例
const pluginManager = new PluginManager();

export { pluginManager, PluginManager, DefaultPlugin };
export * from './interface';
export * from './built-in/memory-monitor';
export * from './built-in/react-profiler';
export * from './built-in/source-map';
export * from './built-in/vue-profiler';

// 对外暴露的默认插件管理器实例
export default new PluginManager();
