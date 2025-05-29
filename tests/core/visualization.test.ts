import Visualization from '../../src/core/Visualization';

describe('Visualization', () => {
  let vis: Visualization;

  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    vis = new Visualization();
  });

  test('should initialize visualization with element', () => {
    vis.init('chart');
    expect(vis).toBeDefined();
  });

  test('should render visualization', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    vis.init('chart');
    vis.render();
    expect(consoleSpy).toHaveBeenCalledWith('Rendering data visualization');
  });
});
