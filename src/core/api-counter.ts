/* eslint-disable indent */
import {
  IAPICounter,
  IAPICounterConfig,
  IAPICounterStatus,
  IAPIQuota,
  IAPIRequest,
} from '../types/api-counter';

/**
 * API调用计数器，控制API的使用量
 * @class APICounter
 * @implements {IAPICounter}
 */
export class APICounter implements IAPICounter {
  private count: number = 0;
  private config: IAPICounterConfig;
  private lastResetDate: number = Date.now();
  private requestsHistory: IAPIRequest[];
  private subscribers: ((status: IAPICounterStatus) => void)[];

  /**
   * 创建API计数器实例
   * @param {Partial<IAPICounterConfig>} config 计数器配置
   */
  constructor(config: Partial<IAPICounterConfig> = {}) {
    // 默认配置
    this.config = {
      maxFree: 1000,
      resetPeriod: 'daily',
      storageKey: 'perflite_api_counter',
      alertThreshold: 0.8,
      quotaExceededAction: 'fallback',
      errorMargin: 0.05,
      ...config,
    };

    this.subscribers = [];
    this.requestsHistory = [];

    // 从存储中恢复数据
    this.loadState();

    // 检查是否需要重置
    this.checkAndReset();
  }

  /**
   * 检查是否可以进行API调用
   * @returns {boolean} 是否可以调用API
   */
  public check(): boolean {
    this.checkAndReset();
    return this.count < this.config.maxFree;
  }

  /**
   * 增加API调用计数
   * @param {number} tokensUsed 使用的令牌数量
   * @returns {boolean} 是否成功增加计数
   */
  public increment(tokensUsed = 1): boolean {
    this.checkAndReset();

    if (this.count < this.config.maxFree) {
      this.count += tokensUsed;
      this.saveState();
      this.notifySubscribers();
      return true;
    }

    return false;
  }

  /**
   * 获取当前计数器状态
   * @returns {IAPICounterStatus} 计数器状态
   */
  public getStatus(): IAPICounterStatus {
    this.checkAndReset();

    const remaining = Math.max(0, this.config.maxFree - this.count);
    const usagePercentage = (this.count / this.config.maxFree) * 100;
    const isApproachingLimit = usagePercentage >= (this.config.alertThreshold || 0.8) * 100;

    // 计算下次重置时间
    const nextResetTime = this.calculateNextResetTime();

    return {
      count: this.count,
      remaining,
      resetDate: new Date(this.lastResetDate),
      isLimited: remaining <= 0,
      usagePercentage,
      isApproachingLimit,
      nextResetTime,
      history: this.generateHistory(),
    };
  }

  /**
   * 手动重置计数器
   */
  public reset(): void {
    this.count = 0;
    this.lastResetDate = Date.now();
    this.saveState();
    this.notifySubscribers();
  }

  /**
   * 更新计数器配置
   * @param {Partial<IAPICounterConfig>} config 新配置
   */
  public setConfig(config: Partial<IAPICounterConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveState();
  }

  /**
   * 获取当前配置
   * @returns {IAPICounterConfig} 当前配置
   */
  public getConfig(): IAPICounterConfig {
    return { ...this.config };
  }

  /**
   * 记录API请求
   * @param {IAPIRequest} request 请求详情
   */
  public trackRequest(request: IAPIRequest): void {
    this.requestsHistory.push(request);

    // 限制历史记录大小
    if (this.requestsHistory.length > 1000) {
      this.requestsHistory = this.requestsHistory.slice(-1000);
    }

    this.saveState();
  }

  /**
   * 获取使用历史记录
   * @param {number} days 天数
   * @returns {IAPIRequest[]} 历史记录
   */
  public getUsageHistory(days = 7): IAPIRequest[] {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.requestsHistory.filter((req) => req.timestamp >= cutoffTime);
  }

  /**
   * 获取使用趋势
   * @returns 使用趋势数据
   */
  public getUsageTrend() {
    const now = new Date();
    const result = [];

    // 获取过去7天的数据
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

      const dayRequests = this.requestsHistory.filter(
        (req) => req.timestamp >= dayStart && req.timestamp <= dayEnd
      );

      const count = dayRequests.length;

      // 计算趋势
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (i < 6) {
        const prevCount = result[result.length - 1]?.count || 0;
        if (count > prevCount * 1.1) trend = 'up';
        else if (count < prevCount * 0.9) trend = 'down';
      }

      result.push({
        period: dateStr,
        count,
        trend,
        percentage: this.config.maxFree ? (count / this.config.maxFree) * 100 : 0,
      });
    }

    return result;
  }

  /**
   * 估计剩余使用量
   * @returns 剩余使用估计
   */
  public estimateRemainingUsage() {
    const trend = this.getUsageTrend();
    if (trend.length < 3) {
      return { daysRemaining: Infinity };
    }

    // 计算平均每日使用量
    const recentUsage = trend.slice(-3);
    const avgDailyUsage = recentUsage.reduce((sum, day) => sum + day.count, 0) / recentUsage.length;

    if (avgDailyUsage <= 0) {
      return { daysRemaining: Infinity };
    }

    const remaining = this.config.maxFree - this.count;
    const daysRemaining = Math.ceil(remaining / avgDailyUsage);

    let estimatedDepletionDate = undefined;
    if (daysRemaining !== Infinity && daysRemaining >= 0) {
      estimatedDepletionDate = new Date();
      estimatedDepletionDate.setDate(estimatedDepletionDate.getDate() + daysRemaining);
    }

    return {
      daysRemaining,
      estimatedDepletionDate,
    };
  }

  /**
   * 获取配额信息
   * @returns {IAPIQuota} 配额信息
   */
  public getQuota(): IAPIQuota {
    this.checkAndReset();

    return {
      service: this.config.serviceId || 'deepseek',
      limit: this.config.maxFree,
      period: this.config.resetPeriod === 'never' ? 'annual' : this.config.resetPeriod,
      used: this.count,
      remaining: Math.max(0, this.config.maxFree - this.count),
      resetDate: new Date(this.calculateNextResetTime()),
    };
  }

  /**
   * 订阅状态变更
   * @param {function} callback 回调函数
   * @returns {function} 取消订阅的函数
   */
  public subscribe(callback: (status: IAPICounterStatus) => void): () => void {
    this.subscribers.push(callback);

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * 接近限制时通知
   * @param {number} threshold 阈值
   * @returns {boolean} 是否接近限制
   */
  public notifyApproachingLimit(threshold?: number): boolean {
    const thresholdValue = threshold || this.config.alertThreshold || 0.8;
    const status = this.getStatus();

    if (status.usagePercentage / 100 >= thresholdValue) {
      this.notifySubscribers();
      return true;
    }

    return false;
  }

  /**
   * 检查并根据重置策略重置计数器
   * @private
   */
  private checkAndReset(): void {
    const now = new Date();
    const lastReset = new Date(this.lastResetDate);
    let shouldReset = false;

    switch (this.config.resetPeriod) {
      case 'daily':
        shouldReset =
          now.getDate() !== lastReset.getDate() ||
          now.getMonth() !== lastReset.getMonth() ||
          now.getFullYear() !== lastReset.getFullYear();
        break;
      case 'monthly':
        shouldReset =
          now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
        break;
      case 'never':
        shouldReset = false;
        break;
    }

    if (shouldReset) {
      this.count = 0;
      this.lastResetDate = now.getTime();
      this.saveState();
    }
  }

  /**
   * 计算下次重置时间
   * @private
   * @returns {number} 下次重置的时间戳
   */
  private calculateNextResetTime(): number {
    const now = new Date();

    switch (this.config.resetPeriod) {
      case 'daily': {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
      }
      case 'monthly': {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth.getTime();
      }
      case 'never':
      default:
        return Infinity;
    }
  }

  /**
   * 生成使用历史数据
   * @private
   * @returns 历史数据
   */
  private generateHistory() {
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

      const dayRequests = this.requestsHistory.filter(
        (req) => req.timestamp >= dayStart && req.timestamp <= dayEnd
      );

      result.push({
        date: dateStr,
        count: dayRequests.length,
        percentage: this.config.maxFree ? (dayRequests.length / this.config.maxFree) * 100 : 0,
      });
    }

    return result;
  }

  /**
   * 通知所有订阅者
   * @private
   */
  private notifySubscribers(): void {
    const status = this.getStatus();
    this.subscribers.forEach((callback) => {
      try {
        callback(status);
      } catch (e) {
        console.error('Error in APICounter subscriber:', e);
      }
    });
  }

  /**
   * 加载状态
   * @private
   */
  private loadState(): void {
    try {
      const key = this.config.storageKey || 'perflite_api_counter';
      const storedData = localStorage.getItem(key);

      if (storedData) {
        const data = JSON.parse(storedData);
        this.count = data.count || 0;
        this.lastResetDate = data.lastResetDate || Date.now();
        this.requestsHistory = data.requestsHistory || [];
      } else {
        this.count = 0;
        this.lastResetDate = Date.now();
        this.requestsHistory = [];
      }
    } catch (e) {
      // 出错时使用默认值
      this.count = 0;
      this.lastResetDate = Date.now();
      this.requestsHistory = [];
      console.error('Error loading APICounter state:', e);
    }
  }

  /**
   * 保存状态
   * @private
   */
  private saveState(): void {
    try {
      const key = this.config.storageKey || 'perflite_api_counter';
      const data = {
        count: this.count,
        lastResetDate: this.lastResetDate,
        requestsHistory: this.requestsHistory,
      };

      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving APICounter state:', e);
    }
  }
}

export default APICounter;
