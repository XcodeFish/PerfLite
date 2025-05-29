import md5 from 'md5';
import { cacheGet, cacheSet, cacheHas } from '../utils/cache';

interface IParserInstance extends WebAssembly.Instance {
  exports: {
    parse: (stack: string) => any;
  };
}

class ErrorParser {
  private localParser: IParserInstance;
  private complexStackThreshold: number;

  constructor() {
    // 占位符，实际代码会在加载WASM模块后进行实例化
    this.localParser = {} as IParserInstance;
    this.complexStackThreshold = 5; // 超过5层调用栈用V3
  }

  async parse(stack: string): Promise<any> {
    const hash = md5(stack);
    if (cacheHas(hash)) return cacheGet(hash);

    const isComplex = stack.split('\n').length > this.complexStackThreshold;
    const result = isComplex
      ? await this._callDeepSeekAPI(stack)
      : this.localParser.exports.parse(stack);

    cacheSet(hash, result);
    return result;
  }

  private async _callDeepSeekAPI(stack: string): Promise<any> {
    try {
      const res = await fetch('https://api.deepseek.com/community', {
        headers: {
          'X-API-Key': 'your_community_key',
          'Quota-Mode': 'economy', // 启用低成本模式
        },
      });
      return res.json();
    } catch {
      return this.localParser.exports.parse(stack); // 降级处理
    }
  }
}

export default ErrorParser;
