/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

/**
 * 自定义测试报告生成器
 * 用于收集测试结果并生成JSON格式的测试报告
 */
class CustomReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.testResults = {
      passed: 0,
      failed: 0,
      issues: [],
      performance: {},
    };
    this.ensureReportDirExists();
  }

  ensureReportDirExists() {
    const fs = require('fs');
    const path = require('path');
    const reportDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    return reportDir;
  }

  onRunComplete(contexts, results) {
    console.log('\n===== PerfLite 测试报告 =====\n');

    // 测试结果统计
    console.log(`总测试用例: ${results.numTotalTests}`);
    console.log(`通过: ${results.numPassedTests} ✅`);
    console.log(`失败: ${results.numFailedTests} ❌`);
    console.log(`跳过: ${results.numPendingTests} ⏭️`);

    // 覆盖率统计
    if (results.coverageMap) {
      const coverage = results.coverageMap.getCoverageSummary();
      console.log('\n覆盖率统计:');
      console.log(`语句覆盖率: ${coverage.statements.pct}%`);
      console.log(`分支覆盖率: ${coverage.branches.pct}%`);
      console.log(`函数覆盖率: ${coverage.functions.pct}%`);
      console.log(`行覆盖率: ${coverage.lines.pct}%`);
    }

    // 失败信息详细报告
    if (results.numFailedTests > 0) {
      console.log('\n❌ 失败测试详情:');
      results.testResults.forEach((testFile) => {
        testFile.testResults.forEach((test) => {
          if (test.status === 'failed') {
            console.log(`\n- ${test.ancestorTitles.join(' > ')} > ${test.title}`);
            console.log(`  错误信息: ${test.failureMessages[0].split('\n')[0]}`);
            this.testResults.issues.push({
              test: `${test.ancestorTitles.join(' > ')} > ${test.title}`,
              error: test.failureMessages[0].split('\n')[0],
            });
          }
        });
      });
    }

    // 保存报告到文件
    const fs = require('fs');
    const path = require('path');
    const reportDir = this.ensureReportDirExists();

    fs.writeFileSync(
      path.join(reportDir, 'test-report.json'),
      JSON.stringify(this.testResults, null, 2)
    );

    console.log('\n报告已保存到 test-reports/test-report.json');
  }

  onTestResult(test, testResult) {
    // 统计通过/失败的测试
    this.testResults.passed += testResult.numPassingTests;
    this.testResults.failed += testResult.numFailingTests;

    // 记录性能测试结果
    testResult.testResults.forEach((test) => {
      if (test.title.includes('[性能]') && test.status === 'passed') {
        try {
          // 从测试标题中提取性能数据 (格式如: "[性能] 解析器 - 100ms")
          const match = test.title.match(/\[性能\] (.*?) - (\d+)ms/);
          if (match) {
            const [, name, time] = match;
            this.testResults.performance[name] = parseInt(time);
          }
        } catch {
          // 忽略解析错误，不使用catch变量
        }
      }
    });
  }
}

module.exports = CustomReporter;
