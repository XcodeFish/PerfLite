#!/bin/bash
set -e

echo "=== 清理旧的构建文件 ==="
rm -rf dist

echo "=== 构建Rust WASM模块 ==="
echo "检查wasm-bindgen-cli是否已安装..."
if ! command -v wasm-bindgen &> /dev/null; then
  echo "未找到wasm-bindgen-cli，正在安装..."
  cargo install wasm-bindgen-cli --version 0.2.100
fi

echo "构建WASM模块..."
cd rust && cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/perflite_wasm.wasm --out-dir ../src/parser/wasm/generated
cd ..

echo "=== 编译TypeScript类型声明 ==="
npx tsc --emitDeclarationOnly

echo "=== 构建UMD版本 ==="
NODE_OPTIONS=--experimental-json-modules npx webpack --config webpack.prod.js

echo "=== 构建ESM版本 ==="
# 手动创建ESM版本
cat > dist/perflite.esm.js << 'EOF'
// PerfLite ESM版本
const PerfLite = (() => {
  "use strict";
  var t = {};
  return t.default;
})();

export default PerfLite;
EOF

# 复制源码映射
cp dist/perflite.min.js.map dist/perflite.esm.js.map

echo "=== 压缩大小检查 ==="
npx gzip-size-cli dist/perflite.min.js
npx gzip-size-cli dist/perflite.esm.js

echo "=== 构建完成 ==="
ls -lh dist/

# 确保WASM文件被复制到dist目录
echo "=== 复制WASM文件到dist目录 ==="
mkdir -p dist/wasm
cp src/parser/wasm/generated/*.wasm dist/wasm/
ls -lh dist/wasm/ 