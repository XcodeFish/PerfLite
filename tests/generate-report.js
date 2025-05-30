/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

/* eslint-disable max-len */
// tests/generate-report.js
// 该文件是Node.js脚本，用于生成测试报告，不遵循项目的TypeScript规范

const fs = require('fs');
const path = require('path');

function ensureReportDirExists() {
  const reportDir = path.join(process.cwd(), 'test-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return reportDir;
}

function generateReport() {
  const reportDir = ensureReportDirExists();

  // 尝试读取测试报告
  let testReport;
  try {
    testReport = JSON.parse(fs.readFileSync(path.join(reportDir, 'test-report.json'), 'utf-8'));
  } catch (e) {
    console.error('无法读取测试报告文件:', e);
    process.exit(1);
  }

  // 生成HTML报告
  const html = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PerfLite 测试报告</title>
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1200px; margin: 0 auto; }
      h1, h2, h3 { color: #2c3e50; }
      .summary { display: flex; margin-bottom: 20px; }
      .stat-box { flex: 1; border-radius: 5px; padding: 15px; margin: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
      .pass { background-color: #d4edda; color: #155724; }
      .fail { background-color: #f8d7da; color: #721c24; }
      .neutral { background-color: #e2e3e5; color: #383d41; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th { background: #f8f9fa; padding: 12px 15px; text-align: left; }
      td { padding: 10px 15px; border-top: 1px solid #dee2e6; }
      .issue-row { background-color: #fff3cd; }
      .perf-chart { height: 300px; margin: 20px 0; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  </head>
  <body>
    <div class="container">
      <h1>PerfLite 测试报告</h1>
      
      <div class="summary">
        <div class="stat-box pass">
          <h3>通过测试</h3>
          <p>${testReport.passed}</p>
        </div>
        <div class="stat-box ${testReport.failed > 0 ? 'fail' : 'pass'}">
          <h3>失败测试</h3>
          <p>${testReport.failed}</p>
        </div>
        <div class="stat-box neutral">
          <h3>总测试用例</h3>
          <p>${testReport.passed + testReport.failed}</p>
        </div>
      </div>
      
      <h2>性能测试结果</h2>
      <div class="perf-chart">
        <canvas id="perfChart"></canvas>
      </div>
      
      ${
        testReport.issues.length > 0
          ? `
        <h2>测试问题</h2>
        <table>
          <thead>
            <tr>
              <th>测试用例</th>
              <th>错误信息</th>
            </tr>
          </thead>
          <tbody>
            ${testReport.issues
              .map(
                (issue) => `
              <tr class="issue-row">
                <td>${issue.test}</td>
                <td>${issue.error}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `
          : '<h2>没有发现测试问题 ✅</h2>'
      }
    </div>
    
    <script>
      // 性能图表
      const perfData = ${JSON.stringify(testReport.performance || {})};
      const ctx = document.getElementById('perfChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: Object.keys(perfData),
          datasets: [{
            label: '执行时间 (ms)',
            data: Object.values(perfData),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '毫秒'
              }
            }
          }
        }
      });
    </script>
  </body>
  </html>
  `;

  // 保存HTML报告
  fs.writeFileSync(path.join(reportDir, 'test-report.html'), html, 'utf-8');

  console.log('HTML测试报告已生成: test-reports/test-report.html');
}

// 执行报告生成
generateReport();
