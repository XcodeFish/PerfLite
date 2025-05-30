use wasm_bindgen::prelude::*;
use std::fmt;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn warn(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn error(s: &str);
}

/// 提取错误行号和列号的帮助函数
pub fn extract_line_column(s: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() >= 2 {
        let line = parts[parts.len() - 2].parse::<u32>().ok()?;
        let col = parts[parts.len() - 1].parse::<u32>().ok()?;
        return Some((line, col));
    }
    None
}

/// 格式化错误栈信息
pub fn format_stack_frame(func: &str, file: &str, line: u32, col: u32) -> String {
    format!("{}:{}:{}|{}", file, line, col, func)
}

/**
 * 设置panic hook，提高调试体验
 */
pub fn set_panic_hook() {
    // 当wasm panic时，打印更有帮助的错误信息
    console_error_panic_hook::set_once();
    
    // 注册自定义panic处理
    std::panic::set_hook(Box::new(|panic_info| {
        // 获取panic位置
        let location = panic_info.location().unwrap_or_else(|| {
            panic_info.location().unwrap_or_else(|| {
                std::panic::Location::caller()
            })
        });
        
        // 获取panic消息
        let message = match panic_info.payload().downcast_ref::<&'static str>() {
            Some(s) => *s,
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => s.as_str(),
                None => "Unknown panic message",
            },
        };
        
        // 构建详细错误消息
        let error_message = format!(
            "WASM Panic at {}:{}: {}",
            location.file(),
            location.line(),
            message
        );
        
        // 输出到浏览器控制台
        error(&error_message);
    }));
}

/**
 * 向JavaScript控制台输出日志
 */
pub fn log(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::console::log_1(&message.into());
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("{}", message);
    }
}

/**
 * 向JavaScript控制台输出警告信息
 */
pub fn warn(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::console::warn_1(&message.into());
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        eprintln!("WARN: {}", message);
    }
}

/**
 * 向JavaScript控制台输出错误信息
 */
pub fn error(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        web_sys::console::error_1(&message.into());
    }
    #[cfg(not(target_arch = "wasm32"))]
    {
        eprintln!("ERROR: {}", message);
    }
}

/**
 * 生成一个带有时间戳的日志消息
 */
pub fn log_with_timestamp(message: &str) {
    let timestamp = js_sys::Date::now();
    let timestamped_message = format!("[{}] {}", timestamp, message);
    log(&timestamped_message);
}

/**
 * 判断字符串是否包含有效的行列号信息
 */
pub fn has_line_column(s: &str) -> bool {
    extract_line_column(s).is_some()
}

/**
 * 从JavaScript错误栈中提取文件名
 */
pub fn extract_file_name(stack_line: &str) -> Option<String> {
    // 检查常见的格式
    // 格式 1: at Function (file.js:line:column)
    if let Some(start) = stack_line.find('(') {
        if let Some(end) = stack_line[start..].find(')') {
            let file_info = &stack_line[start + 1..start + end];
            if let Some(path_end) = file_info.rfind(':') {
                if let Some(path_start) = file_info[..path_end].rfind(':') {
                    return Some(file_info[..path_start].to_string());
                }
            }
        }
    }
    
    // 格式 2: at file.js:line:column
    if let Some(start) = stack_line.find("at ") {
        let remainder = &stack_line[start + 3..];
        if let Some(path_end) = remainder.rfind(':') {
            if let Some(path_start) = remainder[..path_end].rfind(':') {
                return Some(remainder[..path_start].to_string());
            }
        }
    }
    
    // 格式 3: Function@file.js:line:column
    if let Some(at_pos) = stack_line.find('@') {
        let file_info = &stack_line[at_pos + 1..];
        if let Some(path_end) = file_info.rfind(':') {
            if let Some(path_start) = file_info[..path_end].rfind(':') {
                return Some(file_info[..path_start].to_string());
            }
        }
    }
    
    None
}
