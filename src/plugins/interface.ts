import { IPlugin, IPluginHooks, IPluginConfig, IPluginMetadata } from '@/types/plugin';

/**
 * 基础插件抽象类
 * 提供插件系统的基础实现
 */
export abstract class BasePlugin<T = unknown> implements IPlugin<T> {
  public name: string;
  public version: string;
  public hooks: IPluginHooks<T>;
  public config: IPluginConfig;
  public metadata?: IPluginMetadata;
  private enabled: boolean;
  private eventHandlers: Map<string, Set<(data: unknown) => void>>;

  constructor(
    name: string,
    version: string,
    hooks: IPluginHooks<T>,
    config?: Partial<IPluginConfig>,
    metadata?: IPluginMetadata
  ) {
    this.name = name;
    this.version = version;
    this.hooks = hooks;
    this.enabled = config?.enabled ?? true;
    this.eventHandlers = new Map();

    this.config = {
      name,
      version,
      enabled: this.enabled,
      priority: config?.priority ?? 10,
      dependencies: config?.dependencies ?? [],
      requiresConfig: config?.requiresConfig ?? false,
      ...config,
    };

    this.metadata = metadata;
  }

  public async init(config?: unknown): Promise<boolean> {
    if (this.hooks.init) {
      try {
        await this.hooks.init(config);
        return true;
      } catch (error) {
        console.error(`Plugin ${this.name} initialization failed:`, error);
        return false;
      }
    }
    return true;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public enable(): void {
    this.enabled = true;
    this.config.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
    this.config.enabled = false;
  }

  public async destroy(): Promise<void> {
    if (this.hooks.destroy) {
      await this.hooks.destroy();
    }

    this.eventHandlers.clear();
  }

  public getApi(): Record<string, unknown> {
    return {};
  }

  public getEvents(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  public emit(eventName: string, data: unknown): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in plugin ${this.name} event handler for ${eventName}:`, error);
        }
      });
    }
  }

  public on(eventName: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }

    const handlers = this.eventHandlers.get(eventName)!;
    handlers.add(handler);

    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventName);
      }
    };
  }
}
