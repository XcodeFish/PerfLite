// PerfLite WASM模块
// Rust实现的高性能错误堆栈解析器

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_json;

mod parser;
mod simd;
mod utils;

pub use parser::{ErrorParser, StackFrame};
pub use simd::SimdParser;

// 用于从WASM导出的栈帧结构体
#[derive(Serialize, Deserialize)]
pub struct ExportedStackFrame {
    pub function_name: String,
    pub file_name: String,
    pub line_number: u32,
    pub column_number: u32,
}

// 全局初始化 - 设置panic hook并返回标准解析器
#[wasm_bindgen]
pub fn init_parser() {
    utils::set_panic_hook();
    
    // 在初始化时输出一些基本信息
    utils::log("PerfLite WASM Parser 初始化完成");
}

// 提供一个SIMD优化的解析器初始化函数
#[wasm_bindgen]
pub fn init_simd_parser() {
    utils::set_panic_hook();
    
    // 确认是否支持SIMD
    #[cfg(target_feature = "simd128")]
    utils::log("SIMD支持已启用");
    
    #[cfg(not(target_feature = "simd128"))]
    utils::log("SIMD支持未启用");
}

// 标准版本解析栈信息，返回JSON字符串
#[wasm_bindgen]
pub fn parse(stack: &str) -> String {
    if stack.is_empty() {
        return String::from("[]");
    }
    
    let parser = ErrorParser::new();
    let frames = parser.parse_frames(stack);
    
    // 将栈帧转换为可导出格式
    let exported_frames: Vec<ExportedStackFrame> = frames.into_iter()
        .map(|frame| ExportedStackFrame {
            function_name: frame.function_name().to_string(),
            file_name: frame.file_name().to_string(),
            line_number: frame.line_number(),
            column_number: frame.column_number(),
        })
        .collect();
    
    // 序列化为JSON
    match serde_json::to_string(&exported_frames) {
        Ok(json) => json,
        Err(e) => {
            utils::log(&format!("JSON序列化错误: {}", e));
            String::from("[]")
        }
    }
}

// SIMD优化版本解析数字
#[wasm_bindgen]
#[cfg(target_feature = "simd128")]
pub fn parse_numbers_simd(stack: &str) -> Vec<u32> {
    let parser = SimdParser::new();
    parser.parse_numbers(stack)
}

// SIMD优化版本解析数字 (非SIMD回退版本)
#[wasm_bindgen]
#[cfg(not(target_feature = "simd128"))]
pub fn parse_numbers_simd(stack: &str) -> Vec<u32> {
    utils::log("SIMD未启用，使用标准解析");
    let parser = ErrorParser::new();
    parser.parse_numbers(stack)
}

// SIMD优化完整栈解析，返回JSON字符串
#[wasm_bindgen]
#[cfg(target_feature = "simd128")]
pub fn parse_stack_simd(stack: &str) -> String {
    if stack.is_empty() {
        return String::from("[]");
    }
    
    let parser = SimdParser::new();
    let frames = parser.parse_stack(stack);
    
    // 将栈帧转换为可导出格式
    let exported_frames: Vec<ExportedStackFrame> = frames.into_iter()
        .map(|frame| ExportedStackFrame {
            function_name: frame.function_name().to_string(),
            file_name: frame.file_name().to_string(),
            line_number: frame.line_number(),
            column_number: frame.column_number(),
        })
        .collect();
    
    // 序列化为JSON
    match serde_json::to_string(&exported_frames) {
        Ok(json) => json,
        Err(e) => {
            utils::log(&format!("JSON序列化错误: {}", e));
            String::from("[]")
        }
    }
}

// SIMD优化完整栈解析 (非SIMD回退版本)
#[wasm_bindgen]
#[cfg(not(target_feature = "simd128"))]
pub fn parse_stack_simd(stack: &str) -> String {
    utils::log("SIMD未启用，使用标准解析");
    parse(stack)
}

// SIMD优化的行列号解析
#[wasm_bindgen]
#[cfg(target_feature = "simd128")]
pub fn parse_line_column_simd(stack: &str) -> Vec<u32> {
    let parser = SimdParser::new();
    parser.parse_line_column(stack)
}

// SIMD优化的行列号解析 (非SIMD回退版本)
#[wasm_bindgen]
#[cfg(not(target_feature = "simd128"))]
pub fn parse_line_column_simd(stack: &str) -> Vec<u32> {
    utils::log("SIMD未启用，使用标准解析");
    let parser = ErrorParser::new();
    parser.parse_line_column(stack)
}

// 提供版本信息
#[wasm_bindgen]
pub fn get_version() -> String {
    let version = env!("CARGO_PKG_VERSION");
    version.to_string()
}

// 判断是否启用了SIMD
#[wasm_bindgen]
pub fn is_simd_enabled() -> bool {
    #[cfg(target_feature = "simd128")]
    return true;
    
    #[cfg(not(target_feature = "simd128"))]
    return false;
}

// 提供控制台日志函数
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// 日志宏，方便调试
#[macro_export]
macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_stack_parse() {
        let parser = ErrorParser::new();
        let test_stack = r#"Error: Test error
            at Component (/src/App.js:10:15)
            at Router (/node_modules/react-router/index.js:20:10)"#;
            
        let result = parser.parse(test_stack);
        assert!(result.contains("App.js:10"));
    }
    
    #[test]
    fn test_empty_stack() {
        let result = parse("");
        assert_eq!(result, "[]");
    }

    #[test]
    fn test_multi_line_stack() {
        let parser = ErrorParser::new();
        let test_stack = r#"Error: Complex error
            at Component (/src/App.js:10:15)
            at Router (/node_modules/react-router/index.js:20:10)
            at Provider (/node_modules/redux/index.js:30:5)"#;
            
        let result = parser.parse(test_stack);
        assert!(result.contains("App.js:10"));
        assert!(result.contains("react-router/index.js:20"));
        assert!(result.contains("redux/index.js:30"));
    }

    #[test]
    fn test_invalid_stack() {
        let parser = ErrorParser::new();
        let test_stack = "Invalid stack trace format";
        let result = parser.parse(test_stack);
        assert_eq!(result, "");
    }
    
    #[test]
    fn test_parse_function() {
        let test_stack = r#"Error: Test error
            at Component (/src/App.js:10:15)"#;
        
        let json = parse(test_stack);
        assert!(json.contains("\"function_name\":"));
        assert!(json.contains("\"file_name\":"));
        assert!(json.contains("\"line_number\":"));
        assert!(json.contains("\"column_number\":"));
    }
    
    #[test]
    fn test_json_format() {
        let test_stack = r#"Error: Test error
            at Component (/src/App.js:10:15)"#;
        
        let json = parse(test_stack);
        // 验证JSON格式是否正确
        let parsed: Result<Vec<ExportedStackFrame>, _> = serde_json::from_str(&json);
        assert!(parsed.is_ok());
        assert_eq!(parsed.unwrap().len(), 1);
    }
}