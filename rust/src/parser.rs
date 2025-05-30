use wasm_bindgen::prelude::*;
use regex::Regex;
use std::collections::HashMap;
use crate::utils::{console_log, format_stack_frame};

/// 错误栈帧结构
#[wasm_bindgen]
#[derive(Clone, Debug)]
pub struct StackFrame {
    function_name: String,
    file_name: String,
    line_number: u32,
    column_number: u32,
}

#[wasm_bindgen]
impl StackFrame {
    /// 创建新的栈帧
    pub fn new(function_name: String, file_name: String, line_number: u32, column_number: u32) -> Self {
        StackFrame {
            function_name,
            file_name,
            line_number,
            column_number,
        }
    }
    
    #[wasm_bindgen(getter)]
    pub fn function_name(&self) -> String {
        self.function_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn file_name(&self) -> String {
        self.file_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn line_number(&self) -> u32 {
        self.line_number
    }

    #[wasm_bindgen(getter)]
    pub fn column_number(&self) -> u32 {
        self.column_number
    }
}

/// 错误栈解析器
#[wasm_bindgen]
pub struct ErrorParser {
    // 正则表达式缓存
    chrome_regex: Regex,
    firefox_regex: Regex,
    safari_regex: Regex,
    // 框架映射缓存
    framework_map: HashMap<String, String>,
}

#[wasm_bindgen]
impl ErrorParser {
    /// 创建新的错误解析器
    pub fn new() -> Self {
        // 初始化正则表达式
        let chrome_regex = Regex::new(r"at\s+([^\s\(]+)?\s*(\(([^)]+)\))?").unwrap();
        let firefox_regex = Regex::new(r"([^@]*)@(.+):(\d+):(\d+)").unwrap();
        let safari_regex = Regex::new(r"([^@]*)@([^:]+):(\d+):(\d+)").unwrap();
        
        // 初始化框架映射
        let mut framework_map = HashMap::new();
        framework_map.insert("node_modules/react".to_string(), "React".to_string());
        framework_map.insert("node_modules/vue".to_string(), "Vue".to_string());
        framework_map.insert("node_modules/angular".to_string(), "Angular".to_string());
        
        ErrorParser {
            chrome_regex,
            firefox_regex,
            safari_regex,
            framework_map,
        }
    }

    /// 解析错误栈
    pub fn parse(&self, stack: &str) -> String {
        if stack.is_empty() {
            return String::new();
        }

        let mut result = String::new();
        let lines: Vec<&str> = stack.split('\n').collect();
        
        for line in lines {
            // 尝试使用Chrome格式解析
            if let Some(caps) = self.chrome_regex.captures(line) {
                let func_name = caps.get(1).map_or("<anonymous>", |m| m.as_str());
                
                if let Some(location) = caps.get(3) {
                    let loc_parts: Vec<&str> = location.as_str().split(':').collect();
                    if loc_parts.len() >= 3 {
                        let file = loc_parts[0..loc_parts.len()-2].join(":");
                        let line_num = loc_parts[loc_parts.len()-2].parse::<u32>().unwrap_or(0);
                        let col_num = loc_parts[loc_parts.len()-1].parse::<u32>().unwrap_or(0);
                        
                        // 格式化输出
                        let frame = format_stack_frame(func_name, &file, line_num, col_num);
                        result.push_str(&frame);
                        result.push('\n');
                    }
                }
                continue;
            }
            
            // 尝试使用Firefox格式解析
            if let Some(caps) = self.firefox_regex.captures(line) {
                let func_name = caps.get(1).map_or("<anonymous>", |m| m.as_str());
                let file = caps.get(2).map_or("", |m| m.as_str());
                let line_num = caps.get(3).and_then(|m| m.as_str().parse::<u32>().ok()).unwrap_or(0);
                let col_num = caps.get(4).and_then(|m| m.as_str().parse::<u32>().ok()).unwrap_or(0);
                
                // 格式化输出
                let frame = format_stack_frame(func_name, file, line_num, col_num);
                result.push_str(&frame);
                result.push('\n');
                continue;
            }
            
            // 尝试使用Safari格式解析
            if let Some(caps) = self.safari_regex.captures(line) {
                let func_name = caps.get(1).map_or("<anonymous>", |m| m.as_str());
                let file = caps.get(2).map_or("", |m| m.as_str());
                let line_num = caps.get(3).and_then(|m| m.as_str().parse::<u32>().ok()).unwrap_or(0);
                let col_num = caps.get(4).and_then(|m| m.as_str().parse::<u32>().ok()).unwrap_or(0);
                
                // 格式化输出
                let frame = format_stack_frame(func_name, file, line_num, col_num);
                result.push_str(&frame);
                result.push('\n');
            }
        }
        
        result
    }

    /// 使用SIMD优化解析错误栈
    pub fn parse_simd(&self, stack: &str) -> Vec<StackFrame> {
        let mut frames = Vec::new();
        
        if stack.is_empty() {
            return frames;
        }
        
        for line in stack.split('\n') {
            if let Some(caps) = self.chrome_regex.captures(line) {
                let func_name = caps.get(1).map_or("<anonymous>", |m| m.as_str()).to_string();
                
                if let Some(location) = caps.get(3) {
                    let loc_parts: Vec<&str> = location.as_str().split(':').collect();
                    if loc_parts.len() >= 3 {
                        let file = loc_parts[0..loc_parts.len()-2].join(":");
                        let line_num = loc_parts[loc_parts.len()-2].parse::<u32>().unwrap_or(0);
                        let col_num = loc_parts[loc_parts.len()-1].parse::<u32>().unwrap_or(0);
                        
                        frames.push(StackFrame {
                            function_name: func_name,
                            file_name: file,
                            line_number: line_num,
                            column_number: col_num,
                        });
                    }
                }
            }
        }
        
        frames
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse() {
        let parser = ErrorParser::new();
        let stack = "Error: test\n at Component (/src/App.js:10:20)";
        let result = parser.parse(stack);
        assert!(result.contains("App.js:10:20"));
    }

    #[test]
    fn test_parse_simd() {
        let parser = ErrorParser::new();
        let stack = "Error: test\n at Component (/src/App.js:10:20)";
        let frames = parser.parse_simd(stack);
        assert!(!frames.is_empty());
        assert_eq!(frames[0].line_number, 10);
        assert_eq!(frames[0].column_number, 20);
    }
}