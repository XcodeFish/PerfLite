#!/bin/bash
set -e

echo "===== 初始化Git Hooks ====="

# 检查git是否初始化
if [ ! -d ".git" ]; then
  echo "正在初始化Git仓库..."
  git init
fi

# 安装husky
echo "安装husky..."
npx husky install

# 添加pre-commit钩子
echo "配置pre-commit钩子..."
npx husky add .husky/pre-commit "npx lint-staged"
chmod +x .husky/pre-commit

# 添加commit-msg钩子
echo "配置commit-msg钩子..."
npx husky add .husky/commit-msg "npx --no-install commitlint --edit \$1"
chmod +x .husky/commit-msg

# 初始化gitignore如果不存在
if [ ! -f ".gitignore" ]; then
  echo "创建.gitignore文件..."
  cat > .gitignore << EOF
# 依赖
node_modules/
.pnpm-store/

# 构建输出
dist/
build/
lib/
types/

# 日志
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# 测试覆盖率
coverage/

# IDE和编辑器
.idea/
.vscode/
*.swp
*.swo

# 操作系统
.DS_Store
Thumbs.db

# 环境变量
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Rust/WASM
target/
**/*.rs.bk
Cargo.lock
EOF
fi

echo "===== Git Hooks初始化完成 ✓ ====="
echo "现在可以使用标准化的Git提交流程" 
echo "孩子你开心快乐的玩耍吧" 