#!/bin/bash

# 确保wasm-pack已安装
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack未安装，正在安装..."
    cargo install wasm-pack
fi

# 清理之前的构建
rm -rf pkg

# 构建WASM模块（开发版本）
echo "构建开发版本..."
wasm-pack build --dev

# 构建WASM模块（发布版本）
echo "构建发布版本..."
wasm-pack build --release --target web

# 优化WASM文件大小
if command -v wasm-gc &> /dev/null; then
    echo "正在优化WASM文件大小..."
    wasm-gc pkg/perflite_wasm_bg.wasm pkg/perflite_wasm_bg_optimized.wasm
    mv pkg/perflite_wasm_bg_optimized.wasm pkg/perflite_wasm_bg.wasm
else
    echo "wasm-gc未安装，跳过优化步骤。推荐安装wasm-gc以获得更小的文件体积。"
    echo "安装命令: cargo install wasm-gc"
fi

# 复制生成的文件到正确的位置
echo "复制文件到项目结构..."
mkdir -p ../dist/wasm
cp pkg/perflite_wasm_bg.wasm ../dist/wasm/parser.wasm
cp pkg/perflite_wasm.js ../dist/wasm/parser.js

echo "WASM构建完成！"
