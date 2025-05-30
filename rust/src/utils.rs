use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    pub fn log(s: &str);
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
