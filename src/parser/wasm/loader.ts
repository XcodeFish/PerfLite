/**
 * WASM加载器 - 负责加载和实例化WebAssembly模块
 */
export class WasmLoader {
  private static instance: WasmLoader;
  private wasmInstance: WebAssembly.Instance | null = null;
  private isLoading: boolean = false;
  private loadPromise: Promise<WebAssembly.Instance | null> | null = null;
  private hasSimdSupport: boolean | null = null;
  private simdDetectionPromise: Promise<boolean> | null = null;

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
    path: string = '/wasm/parser.wasm',
    fallbackPath: string = '/wasm/parser_no_simd.wasm'
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
        // 检查是否支持SIMD
        const hasSimd = await this.checkSimdSupport();

        // 选择合适的WASM文件
        const wasmPath = hasSimd ? path : fallbackPath;
        console.log(`加载WASM模块: ${wasmPath} (SIMD: ${hasSimd ? '启用' : '禁用'})`);

        const response = await fetch(wasmPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM module: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();

        // 创建导入对象，提供JS环境给WASM
        const importObject = {
          env: {
            memory: new WebAssembly.Memory({ initial: 10, maximum: 100 }),
            console_log: (ptr: number, len: number) => {
              // 处理来自WASM的日志
              const memory = (this.wasmInstance?.exports as any)?.memory;
              if (memory) {
                const array = new Uint8Array(memory.buffer, ptr, len);
                const string = new TextDecoder('utf-8').decode(array);
                console.log('[WASM]', string);
              }
            },
          },
          wbg: {
            // 额外的wasm-bindgen函数
            __wbindgen_throw: (ptr: number, len: number) => {
              const view = new Uint8Array((this.wasmInstance?.exports as any)?.memory.buffer);
              const message = new TextDecoder('utf-8').decode(view.subarray(ptr, ptr + len));
              throw new Error(message);
            },
          },
        };

        // 实例化WASM模块
        const result = await WebAssembly.instantiate(buffer, importObject);
        this.wasmInstance = result.instance;

        // 初始化WASM模块
        const exports = this.wasmInstance.exports as any;
        if (typeof exports.init_parser === 'function') {
          exports.init_parser();
        }

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

  /**
   * 检查浏览器是否支持SIMD
   */
  public async checkSimdSupport(): Promise<boolean> {
    if (this.hasSimdSupport !== null) {
      return this.hasSimdSupport;
    }

    if (this.simdDetectionPromise) {
      return this.simdDetectionPromise;
    }

    this.simdDetectionPromise = (async () => {
      try {
        // 测试SIMD支持 - 使用标准WASM SIMD测试二进制
        const binary = new Uint8Array([
          0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
          0x03, 0x02, 0x01, 0x00, 0x07, 0x08, 0x01, 0x04, 0x74, 0x65, 0x73, 0x74, 0x00, 0x00, 0x0a,
          0x09, 0x01, 0x07, 0x00, 0xfd, 0x0f, 0x00, 0x00, 0x0b,
        ]);
        await WebAssembly.instantiate(binary);
        this.hasSimdSupport = true;
        console.log('SIMD支持已检测: 可用');
        return true;
      } catch (_error) {
        console.error('SIMD支持检测失败:', _error);
        // 也检测浏览器特定的SIMD支持
        try {
          // 检测是否有SIMD支持的其他方法
          // 某些浏览器可能有自定义的方式检测SIMD支持
          const testSimd = () => {
            try {
              // 尝试创建一个SIMD指令的WASM模块
              return WebAssembly.validate(
                new Uint8Array([
                  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x05, 0x01, 0x60, 0x00,
                  0x01, 0x7b,
                ])
              );
            } catch {
              return false;
            }
          };

          if (testSimd()) {
            this.hasSimdSupport = true;
            console.log('SIMD支持已检测: 可用 (通过WebAssembly.validate)');
            return true;
          }
        } catch {
          // 忽略错误
        }

        this.hasSimdSupport = false;
        console.log('SIMD支持已检测: 不可用');
        return false;
      }
    })();

    return this.simdDetectionPromise;
  }

  /**
   * 检查是否支持SIMD
   */
  public supportsSimd(): boolean {
    return !!this.hasSimdSupport;
  }

  /**
   * 重置WASM实例，用于测试或资源清理
   */
  public reset(): void {
    this.wasmInstance = null;
    this.isLoading = false;
    this.loadPromise = null;
  }
}
