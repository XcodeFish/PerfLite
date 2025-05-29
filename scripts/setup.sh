#!/bin/bash
set -e

echo "===== PerfLite 傻瓜式一键构建环境设置 ====="

# 检测操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="MacOS"
    echo "检测到 MacOS 系统"
    
    # 检查Homebrew是否安装
    if ! command -v brew &> /dev/null; then
        echo "建议安装Homebrew以获得更好体验，请访问: https://brew.sh/"
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="Linux"
    echo "检测到 Linux 系统"
else
    OS_TYPE="Other"
    echo "检测到其他操作系统: $OSTYPE"
fi

# 检查 Rust 是否已安装
if ! command -v rustc &> /dev/null; then
    echo "安装 Rust 和 Cargo..."
    if [[ "$OS_TYPE" == "MacOS" ]]; then
        echo "在 MacOS 上安装 Rust..."
        # 对于M1/M2芯片可能需要额外步骤
        if [[ $(uname -m) == "arm64" ]]; then
            echo "检测到 Apple Silicon (M1/M2) 芯片"
        fi
    fi
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # 确保路径设置正确
    if [[ "$OS_TYPE" == "MacOS" ]]; then
        source "$HOME/.cargo/env"
        # 在.zshrc中添加cargo路径(如果是zsh且未添加)
        if [[ "$SHELL" == *"zsh"* ]] && ! grep -q '.cargo/env' "$HOME/.zshrc"; then
            echo 'source "$HOME/.cargo/env"' >> "$HOME/.zshrc"
            echo "已将Cargo环境变量添加到 .zshrc"
        fi
    else
        source "$HOME/.cargo/env"
    fi
else
    echo "Rust 已安装 ✓"
fi

# 检查是否已添加 wasm32 目标
if rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "wasm32-unknown-unknown 目标已安装 ✓"
else
    echo "添加 wasm32-unknown-unknown 目标..."
    rustup target add wasm32-unknown-unknown
fi

# 检查 wasm-bindgen-cli 是否已安装且版本正确
if command -v wasm-bindgen &> /dev/null && [[ $(wasm-bindgen --version) == *"0.2.88"* ]]; then
    echo "wasm-bindgen-cli v0.2.88 已安装 ✓"
else
    echo "安装 wasm-bindgen-cli v0.2.88..."
    cargo install wasm-bindgen-cli --version 0.2.88 --force
fi

# 检查包管理器并安装依赖
if command -v pnpm &> /dev/null; then
    echo "使用 pnpm 安装依赖..."
    pnpm install
elif command -v npm &> /dev/null; then
    echo "pnpm未找到，使用npm安装依赖..."
    npm install
else
    echo "警告: 未找到npm或pnpm。请安装Node.js及其包管理器。"
    if [[ "$OS_TYPE" == "MacOS" ]]; then
        echo "在MacOS上，可以使用: brew install node"
    fi
    exit 1
fi

echo "===== 环境设置完成 ✓ ====="
echo "现在可以运行 'pnpm run build:all' 构建项目肆意玩耍了孩子" 