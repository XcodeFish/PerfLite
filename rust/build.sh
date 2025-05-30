#!/bin/bash
set -e

echo "===== 开始构建WASM模块 ====="

# 使用cargo构建WASM
echo "使用cargo构建WASM..."
cargo build --release --target wasm32-unknown-unknown

# 使用wasm-bindgen生成JS绑定
echo "使用wasm-bindgen生成JS绑定..."
mkdir -p ../src/parser/wasm/generated
wasm-bindgen target/wasm32-unknown-unknown/release/perflite_wasm.wasm --out-dir ../src/parser/wasm/generated

echo "WASM模块构建完成!"
ls -lh ../src/parser/wasm/generated/
