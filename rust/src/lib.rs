// PerfLite WASM模块
// 这是一个占位符文件，将实现WASM解析器

use wasm_bindgen::prelude::*;
mod parser;

pub use parser::ErrorParser;

// 提供一个全局初始化函数
#[wasm_bindgen]
pub fn init_parser() -> ErrorParser {
    console_error_panic_hook::set_once();
    ErrorParser::new()
}

#[wasm_bindgen]
pub fn parse(stack: &str) -> String {
    // 简单实现，将在后续开发中完善
    format!("Parsed: {}", stack)
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
        let parser = ErrorParser::new();
        let result = parser.parse("");
        assert_eq!(result, "");
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
}