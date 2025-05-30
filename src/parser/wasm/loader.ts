/**
 * WASM加载器 - 负责加载和实例化WebAssembly模块
 */
export class WasmLoader {
  private static instance: WasmLoader;
  private wasmInstance: WebAssembly.Instance | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<WebAssembly.Instance | null> | null = null;

  /**
   * 获取单例实例
   */
  public static getInstance(): WasmLoader {
    if (!WasmLoader.instance) {
      WasmLoader.instance = new WasmLoader();
    }
    return WasmLoader.instance;
  }

  /**
   * 加载WASM模块
   */
  public async loadModule(
    path: string = '/wasm/parser.wasm'
  ): Promise<WebAssembly.Instance | null> {
    if (this.wasmInstance) {
      return this.wasmInstance;
    }

    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;

    this.loadPromise = (async () => {
      try {
        const response = await fetch(path);
        const buffer = await response.arrayBuffer();
        const result = await WebAssembly.instantiate(buffer);
        this.wasmInstance = result.instance;
        return this.wasmInstance;
      } catch (error) {
        console.error('WASM加载失败:', error);
        return null;
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  /**
   * 获取WASM实例
   */
  public getInstance(): WebAssembly.Instance | null {
    return this.wasmInstance;
  }

  /**
   * 检查WASM实例是否加载完成
   */
  public isLoaded(): boolean {
    return !!this.wasmInstance;
  }
}
