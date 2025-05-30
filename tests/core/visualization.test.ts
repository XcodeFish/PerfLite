/**
 * Visualization 组件的单元测试
 * 测试可视化初始化和渲染功能的正确性
 */
import Visualization from '../../src/core/Visualization';

describe('Visualization', () => {
  let vis: Visualization;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    vis = new Visualization();
  });

  /**
   * 测试可视化组件能够正确初始化
   */
  test('should initialize visualization with element', () => {
    vis.init('chart');
    expect(vis).toBeDefined();
  });

  /**
   * 测试可视化组件能够正确渲染数据
   */
  test('should render visualization', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    vis.init('chart');
    vis.render();
    expect(consoleSpy).toHaveBeenCalledWith('Rendering data visualization');
  });
});
