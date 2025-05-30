/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable indent */
import { IDashboardConfig, IChartData, IChartEvent, IChartOptions } from '../types/visualization';
import { ChartAdapter } from './chart-adapter';

/**
 * 仪表盘实现类
 */
export class Dashboard {
  private container: HTMLElement | null = null;
  private config: IDashboardConfig | null = null;
  private data: IChartData | null = null;
  private charts: Map<string, unknown> = new Map();
  private chartContainers: Map<string, HTMLElement> = new Map();
  private adapter: ChartAdapter | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private refreshIntervalId: number | null = null;
  private theme: 'light' | 'dark' | 'auto' = 'light';
  private eventListeners: Map<string, Set<(event: IChartEvent) => void>> = new Map();

  /**
   * 初始化仪表盘
   * @param container 容器元素
   * @param library 使用的图表库
   */
  public init(
    container: HTMLElement,
    library: 'canvas' | 'webgl' | 'chartjs' | 'echarts' = 'canvas'
  ): void {
    this.container = container;
    this.adapter = new ChartAdapter(library);

    // 设置容器样式
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    // 监听容器大小变化
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(container);

    // 绑定事件处理器
    this.bindEvents();
  }

  /**
   * 渲染仪表盘
   * @param data 图表数据
   * @param config 仪表盘配置
   */
  public render(data: IChartData, config: IDashboardConfig): void {
    if (!this.container || !this.adapter) return;

    this.data = data;
    this.config = config;
    this.theme = config.theme;

    // 清空容器
    this.clear();

    // 根据布局类型创建容器
    this.createLayout();

    // 绘制各个图表
    this.renderCharts();

    // 设置刷新间隔
    this.setRefreshInterval(config.refreshInterval);
  }

  /**
   * 更新仪表盘数据
   * @param data 新数据
   */
  public update(data: IChartData): void {
    if (!this.config || !this.adapter) return;

    this.data = data;

    // 更新所有图表数据
    for (const [id, chart] of this.charts.entries()) {
      const itemConfig = this.config.items.find((item) => item.id === id);
      if (itemConfig) {
        const chartData = this.filterDataForChart(this.data, itemConfig);
        if (this.adapter) {
          this.adapter.updateChart(chart, chartData);
        }
      }
    }
  }

  /**
   * 导出仪表盘
   * @param format 导出格式
   */
  public async export(format: 'png' | 'jpg' | 'svg' | 'pdf' | 'json'): Promise<string> {
    if (!this.adapter || !this.config || this.charts.size === 0) {
      return '';
    }

    if (format === 'json') {
      return JSON.stringify({
        config: this.config,
        data: this.data,
      });
    }

    // 简单导出实现，只导出第一个图表
    const [chart] = Array.from(this.charts.entries())[0];
    return this.adapter.exportChart(chart, format === 'pdf' ? 'png' : (format as any));
  }

  /**
   * 设置主题
   * @param theme 主题
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (this.theme === theme || !this.adapter || !this.config) return;

    this.theme = theme;

    // 更新所有图表主题
    for (const [chart] of this.charts.entries()) {
      this.adapter.setTheme(chart, theme);
    }

    // 更新配置
    if (this.config) {
      this.config.theme = theme;
    }

    // 调整容器样式
    if (this.container) {
      this.applyThemeStyles(this.container, theme);
    }
  }

  /**
   * 获取仪表盘数据
   */
  public getData(): IChartData {
    return this.data || {};
  }

  /**
   * 获取仪表盘配置
   */
  public getConfig(): IDashboardConfig | null {
    return this.config;
  }

  /**
   * 设置时间范围
   * @param start 开始时间
   * @param end 结束时间
   */
  public setTimeRange(start: number, end: number): void {
    if (!this.data) return;

    this.data.timeRange = { start, end };

    // 更新所有图表
    this.update(this.data);
  }

  /**
   * 应用过滤器
   * @param filter 过滤条件
   */
  public applyFilter(filter: Record<string, unknown>): void {
    if (!this.data || !this.config) return;

    // 对每个图表应用过滤器
    for (const [id, chart] of this.charts.entries()) {
      const itemConfig = this.config.items.find((item) => item.id === id);
      if (itemConfig) {
        const chartData = this.filterDataForChart(this.data, itemConfig, filter);
        if (this.adapter) {
          this.adapter.updateChart(chart, chartData);
        }
      }
    }
  }

  /**
   * 注册事件监听器
   * @param type 事件类型
   * @param callback 回调函数
   */
  public addEventListener(type: string, callback: (event: IChartEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }

    this.eventListeners.get(type)?.add(callback);
  }

  /**
   * 移除事件监听器
   * @param type 事件类型
   * @param callback 回调函数
   */
  public removeEventListener(type: string, callback: (event: IChartEvent) => void): void {
    if (!this.eventListeners.has(type)) return;

    this.eventListeners.get(type)?.delete(callback);
  }

  /**
   * 销毁仪表盘
   */
  public destroy(): void {
    // 停止自动刷新
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    // 移除容器大小监听
    if (this.resizeObserver && this.container) {
      this.resizeObserver.unobserve(this.container);
      this.resizeObserver.disconnect();
    }

    // 清除所有图表
    this.clear();

    // 重置状态
    this.container = null;
    this.config = null;
    this.data = null;
    this.adapter = null;
    this.charts.clear();
    this.chartContainers.clear();
    this.eventListeners.clear();
  }

  /**
   * 清空仪表盘
   */
  private clear(): void {
    if (!this.container || !this.adapter) return;

    // 销毁所有图表
    for (const chart of this.charts.values()) {
      this.adapter.disposeChart(chart);
    }

    this.charts.clear();
    this.chartContainers.clear();

    // 清空容器
    this.container.innerHTML = '';
  }

  /**
   * 创建仪表盘布局
   */
  private createLayout(): void {
    if (!this.container || !this.config) return;

    // 应用主题样式
    this.applyThemeStyles(this.container, this.config.theme);

    if (this.config.layout === 'grid') {
      this.createGridLayout();
    } else {
      this.createFreeLayout();
    }

    // 添加仪表盘标题
    if (this.config.title) {
      const titleElement = document.createElement('div');
      titleElement.className = 'dashboard-title';
      titleElement.textContent = this.config.title;
      titleElement.style.position = 'absolute';
      titleElement.style.top = '10px';
      titleElement.style.left = '10px';
      titleElement.style.fontSize = '18px';
      titleElement.style.fontWeight = 'bold';
      this.container.appendChild(titleElement);
    }

    // 添加过滤器
    if (this.config.filters && this.config.filters.length > 0) {
      this.createFilterPanel();
    }
  }

  /**
   * 创建网格布局
   */
  private createGridLayout(): void {
    if (!this.container || !this.config) return;

    const gridContainer = document.createElement('div');
    gridContainer.className = 'dashboard-grid';
    gridContainer.style.display = 'grid';
    gridContainer.style.gap = '10px';
    gridContainer.style.padding = '10px';
    gridContainer.style.width = '100%';
    gridContainer.style.height = '100%';
    gridContainer.style.boxSizing = 'border-box';

    // 计算最佳网格列数（简单算法）
    const itemCount = this.config.items.length;
    const columns = Math.ceil(Math.sqrt(itemCount));

    gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

    this.container.appendChild(gridContainer);

    // 创建网格项
    for (const item of this.config.items) {
      const gridItem = document.createElement('div');
      gridItem.className = 'dashboard-grid-item';
      gridItem.style.width = '100%';
      gridItem.style.height = '100%';
      gridItem.style.minHeight = '200px';
      gridItem.style.position = 'relative';
      gridItem.style.borderRadius = '4px';
      gridItem.style.overflow = 'hidden';
      gridItem.dataset.id = item.id;

      // 添加标题
      const itemTitle = document.createElement('div');
      itemTitle.className = 'chart-title';
      itemTitle.textContent = item.title;
      itemTitle.style.padding = '8px';
      itemTitle.style.fontSize = '14px';
      itemTitle.style.fontWeight = 'bold';

      // 添加图表容器
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container';
      chartContainer.style.position = 'absolute';
      chartContainer.style.top = '30px';
      chartContainer.style.left = '0';
      chartContainer.style.right = '0';
      chartContainer.style.bottom = '0';

      gridItem.appendChild(itemTitle);
      gridItem.appendChild(chartContainer);
      gridContainer.appendChild(gridItem);

      this.chartContainers.set(item.id, chartContainer);
    }
  }

  /**
   * 创建自由布局
   */
  private createFreeLayout(): void {
    if (!this.container || !this.config) return;

    const freeContainer = document.createElement('div');
    freeContainer.className = 'dashboard-free';
    freeContainer.style.position = 'relative';
    freeContainer.style.width = '100%';
    freeContainer.style.height = '100%';

    this.container.appendChild(freeContainer);

    // 创建自由放置的项
    for (const item of this.config.items) {
      const freeItem = document.createElement('div');
      freeItem.className = 'dashboard-free-item';
      freeItem.style.position = 'absolute';
      freeItem.style.left = `${item.position.x}px`;
      freeItem.style.top = `${item.position.y}px`;
      freeItem.style.width = `${item.dimensions.width}px`;
      freeItem.style.height = `${item.dimensions.height}px`;
      freeItem.style.borderRadius = '4px';
      freeItem.style.overflow = 'hidden';
      freeItem.dataset.id = item.id;

      // 添加标题
      const itemTitle = document.createElement('div');
      itemTitle.className = 'chart-title';
      itemTitle.textContent = item.title;
      itemTitle.style.padding = '8px';
      itemTitle.style.fontSize = '14px';
      itemTitle.style.fontWeight = 'bold';

      // 添加图表容器
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container';
      chartContainer.style.position = 'absolute';
      chartContainer.style.top = '30px';
      chartContainer.style.left = '0';
      chartContainer.style.right = '0';
      chartContainer.style.bottom = '0';

      freeItem.appendChild(itemTitle);
      freeItem.appendChild(chartContainer);
      freeContainer.appendChild(freeItem);

      this.chartContainers.set(item.id, chartContainer);
    }
  }

  /**
   * 创建过滤器面板
   */
  private createFilterPanel(): void {
    if (!this.container || !this.config || !this.config.filters) return;

    const filterPanel = document.createElement('div');
    filterPanel.className = 'dashboard-filters';
    filterPanel.style.position = 'absolute';
    filterPanel.style.top = '10px';
    filterPanel.style.right = '10px';
    filterPanel.style.display = 'flex';
    filterPanel.style.gap = '10px';

    // 创建过滤器
    for (const filter of this.config.filters) {
      const filterContainer = document.createElement('div');
      filterContainer.className = 'filter-container';

      const filterLabel = document.createElement('label');
      filterLabel.textContent = filter.label;
      filterLabel.style.marginRight = '5px';
      filterLabel.style.fontSize = '12px';

      filterContainer.appendChild(filterLabel);

      // 根据过滤器类型创建不同的控件
      switch (filter.type) {
        case 'dropdown':
          this.createDropdownFilter(filterContainer, filter);
          break;
        case 'search':
          this.createSearchFilter(filterContainer, filter);
          break;
        case 'date':
          this.createDateFilter(filterContainer, filter);
          break;
        case 'range':
          this.createRangeFilter(filterContainer, filter);
          break;
      }

      filterPanel.appendChild(filterContainer);
    }

    this.container.appendChild(filterPanel);
  }

  /**
   * 创建下拉过滤器
   */
  private createDropdownFilter(container: HTMLElement, filter: any): void {
    const select = document.createElement('select');
    select.id = `filter-${filter.id}`;
    select.style.padding = '4px';
    select.style.borderRadius = '4px';

    // 添加选项
    if (filter.options) {
      for (const option of filter.options) {
        const optElement = document.createElement('option');
        optElement.value = option;
        optElement.textContent = option;
        select.appendChild(optElement);
      }
    }

    // 设置默认值
    if (filter.default) {
      select.value = filter.default;
    }

    // 添加变更事件
    select.addEventListener('change', () => {
      this.handleFilterChange(filter.id, select.value);
    });

    container.appendChild(select);
  }

  /**
   * 创建搜索过滤器
   */
  private createSearchFilter(container: HTMLElement, filter: any): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `filter-${filter.id}`;
    input.placeholder = '搜索...';
    input.style.padding = '4px';
    input.style.borderRadius = '4px';

    // 设置默认值
    if (filter.default) {
      input.value = filter.default;
    }

    // 延迟搜索，提高性能
    let searchTimeout: number | null = null;
    input.addEventListener('input', () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      searchTimeout = window.setTimeout(() => {
        this.handleFilterChange(filter.id, input.value);
      }, 300);
    });

    container.appendChild(input);
  }

  /**
   * 创建日期过滤器
   */
  private createDateFilter(container: HTMLElement, filter: any): void {
    const input = document.createElement('input');
    input.type = 'date';
    input.id = `filter-${filter.id}`;
    input.style.padding = '4px';
    input.style.borderRadius = '4px';

    // 设置默认值
    if (filter.default) {
      input.value = filter.default;
    }

    // 添加变更事件
    input.addEventListener('change', () => {
      this.handleFilterChange(filter.id, input.value);
    });

    container.appendChild(input);
  }

  /**
   * 创建范围过滤器
   */
  private createRangeFilter(container: HTMLElement, filter: any): void {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `filter-${filter.id}`;
    slider.min = '0';
    slider.max = '100';
    slider.style.width = '100px';

    // 设置默认值
    if (filter.default) {
      slider.value = filter.default;
    }

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = slider.value;
    valueDisplay.style.marginLeft = '5px';
    valueDisplay.style.fontSize = '12px';

    // 添加变更事件
    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });

    slider.addEventListener('change', () => {
      this.handleFilterChange(filter.id, slider.value);
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);
  }

  /**
   * 渲染所有图表
   */
  private renderCharts(): void {
    if (!this.adapter || !this.config || !this.data) return;

    for (const item of this.config.items) {
      const container = this.chartContainers.get(item.id);
      if (!container) continue;

      // 过滤该图表的数据
      const chartData = this.filterDataForChart(this.data, item);

      // 创建图表选项
      const chartOptions: IChartOptions = {
        type: item.type,
        theme: this.config.theme,
        title: item.title,
        dimensions: item.dimensions,
        legend: true,
        tooltip: true,
        animate: true,
        thresholds: item.thresholds,
      };

      // 创建图表
      const chart = this.adapter.createChart(container, chartOptions);
      this.charts.set(item.id, chart);

      // 更新图表数据
      this.adapter.updateChart(chart, chartData);
    }
  }

  /**
   * 处理容器大小变化
   */
  private handleResize(): void {
    // 简单实现：重新渲染整个仪表盘
    if (this.data && this.config) {
      this.render(this.data, this.config);
    }
  }

  /**
   * 设置自动刷新间隔
   * @param interval 间隔(毫秒)
   */
  private setRefreshInterval(interval?: number): void {
    // 清除先前的间隔
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }

    // 设置新间隔
    if (interval && interval > 0) {
      this.refreshIntervalId = window.setInterval(() => {
        // 触发刷新事件
        this.dispatchEvent({
          type: 'click',
          target: {
            type: 'dashboard',
            id: 'dashboard',
          },
        });
      }, interval);
    }
  }

  /**
   * 应用主题样式
   * @param element 目标元素
   * @param theme 主题
   */
  private applyThemeStyles(element: HTMLElement, theme: 'light' | 'dark' | 'auto'): void {
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      element.style.backgroundColor = '#1f1f1f';
      element.style.color = '#ffffff';
    } else {
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#333333';
    }
  }

  /**
   * 绑定事件处理器
   */
  private bindEvents(): void {
    if (!this.container) return;

    // 点击事件
    this.container.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const chartItem = target.closest('.chart-container') as HTMLElement;

      if (chartItem) {
        const chartId = chartItem.parentElement?.dataset.id;
        if (chartId) {
          this.dispatchEvent({
            type: 'click',
            target: {
              type: 'chart',
              id: chartId,
            },
            position: {
              x: e.clientX,
              y: e.clientY,
            },
          });
        }
      }
    });
  }

  /**
   * 分发事件
   * @param event 事件对象
   */
  private dispatchEvent(event: IChartEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  /**
   * 处理过滤器变更
   * @param filterId 过滤器ID
   * @param value 新值
   */
  private handleFilterChange(filterId: string, value: string): void {
    this.dispatchEvent({
      type: 'filter',
      target: {
        type: 'filter',
        id: filterId,
        value,
      },
    });

    // 应用过滤
    this.applyFilter({ [filterId]: value });
  }

  /**
   * 为特定图表过滤数据
   * @param data 全局数据
   * @param itemConfig 图表配置
   * @param filter 额外过滤器
   */
  private filterDataForChart(
    data: IChartData,
    itemConfig: any,
    filter?: Record<string, unknown>
  ): IChartData {
    // 简单实现：为不同dataSource返回不同的数据子集
    const filteredData: IChartData = {
      ...data,
      metrics: data.metrics?.slice(),
      errors: data.errors?.slice(),
      correlations: data.correlations?.slice(),
    };

    // 应用时间范围过滤
    if (data.timeRange) {
      if (filteredData.metrics) {
        filteredData.metrics = filteredData.metrics.filter(
          (m) => m.timestamp >= data.timeRange!.start && m.timestamp <= data.timeRange!.end
        );
      }

      if (filteredData.errors) {
        filteredData.errors = filteredData.errors.filter(
          (e) => e.timestamp >= data.timeRange!.start && e.timestamp <= data.timeRange!.end
        );
      }
    }

    // 应用额外过滤条件
    if (filter && Object.keys(filter).length > 0) {
      // 应用外部传入的过滤条件
      Object.entries(filter).forEach(([key, value]) => {
        if (filteredData.metrics) {
          filteredData.metrics = filteredData.metrics.filter(
            (item: any) =>
              item[key] === value || item[key]?.toString().includes(value?.toString() || '')
          );
        }
        if (filteredData.errors) {
          filteredData.errors = filteredData.errors.filter(
            (item: any) =>
              item[key] === value || item[key]?.toString().includes(value?.toString() || '')
          );
        }
      });
    }

    // 应用图表特定过滤器
    if (itemConfig.filter) {
      try {
        const filterFn = new Function('item', `return ${itemConfig.filter}`);

        if (filteredData.metrics) {
          filteredData.metrics = filteredData.metrics.filter((item: any) => {
            try {
              return filterFn(item);
            } catch {
              return true;
            }
          });
        }

        if (filteredData.errors) {
          filteredData.errors = filteredData.errors.filter((item: any) => {
            try {
              return filterFn(item);
            } catch {
              return true;
            }
          });
        }
      } catch {
        console.error('过滤器表达式无效:');
      }
    }

    // 应用数据源筛选
    if (itemConfig.dataSource === 'errors') {
      return { errors: filteredData.errors };
    } else if (itemConfig.dataSource === 'metrics') {
      return { metrics: filteredData.metrics };
    } else if (itemConfig.dataSource === 'correlations') {
      return { correlations: filteredData.correlations };
    }

    return filteredData;
  }
}
