class PerformanceAnalyzer {
  private metricsBuffer: Array<{ timestamp: number; [key: string]: any }> = [];

  // 异常关联分析
  correlateErrors(perfData: any, errors: Array<{ timestamp: number; [key: string]: any }>) {
    return errors.map(error => ({
      ...error,
      relatedMetrics: this.metricsBuffer.filter(m =>
        Math.abs(m.timestamp - error.timestamp) < 1000
      )
    }));
  }

  // 添加性能数据
  addMetric(metric: { timestamp: number; [key: string]: any }) {
    this.metricsBuffer.push(metric);
  }

  // 清空性能数据
  clearMetrics() {
    this.metricsBuffer = [];
  }
}

export default PerformanceAnalyzer;