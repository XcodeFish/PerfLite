use wasm_bindgen::prelude::*;

/// SIMD优化的错误栈解析器
#[wasm_bindgen]
pub struct SimdParser {}

#[wasm_bindgen]
impl SimdParser {
    pub fn new() -> Self {
        SimdParser {}
    }

    /// 使用SIMD指令加速数字提取
    pub fn parse_numbers(&self, input: &str) -> Vec<u32> {
        let bytes = input.as_bytes();
        unsafe { self.simd_extract_numbers(bytes) }
    }
    
    /// 使用SIMD指令加速行列号识别
    pub fn parse_line_column(&self, input: &str) -> Vec<u32> {
        let bytes = input.as_bytes();
        unsafe { self.simd_extract_line_column(bytes) }
    }

    /// 使用SIMD指令加速完整错误栈解析
    #[wasm_bindgen]
    pub fn parse_stack_simd(&self, stack: &str) -> Vec<crate::parser::StackFrame> {
        use crate::parser::StackFrame;
        let mut frames = Vec::new();
        
        // 跳过空输入
        if stack.is_empty() {
            return frames;
        }
        
        // 按行分割
        for line in stack.lines() {
            if line.contains(" at ") {
                let parts: Vec<&str> = line.split(" at ").collect();
                if parts.len() > 1 {
                    let func_part = parts[1].trim();
                    
                    // 提取函数名
                    let mut function_name = "";
                    let mut file_name = "";
                    let mut line_num = 0;
                    let mut col_num = 0;
                    
                    if let Some(name_end) = func_part.find('(') {
                        function_name = func_part[..name_end].trim();
                        
                        // 提取文件路径和行列号
                        if func_part.len() > name_end {
                            let file_part = &func_part[name_end..];
                            let file_part = file_part.trim_start_matches('(').trim_end_matches(')');
                            
                            let location_parts: Vec<&str> = file_part.split(':').collect();
                            file_name = location_parts[0];
                            
                            if location_parts.len() > 1 {
                                if let Ok(l) = location_parts[1].parse::<u32>() {
                                    line_num = l;
                                }
                            }
                            
                            if location_parts.len() > 2 {
                                if let Ok(c) = location_parts[2].parse::<u32>() {
                                    col_num = c;
                                }
                            }
                        }
                    } else {
                        // 尝试直接提取
                        function_name = func_part;
                    }
                    
                    // 创建栈帧并添加到结果中
                    frames.push(StackFrame::new(
                        function_name.to_string(),
                        file_name.to_string(),
                        line_num,
                        col_num
                    ));
                }
            }
        }
        
        frames
    }

    /// SIMD优化的数字提取
    unsafe fn simd_extract_numbers(&self, bytes: &[u8]) -> Vec<u32> {
        #[cfg(target_feature = "simd128")]
        {
            use std::arch::wasm32::*;
            let mut result = Vec::new();
            let len = bytes.len();
            let mut i = 0;

            // 数字的ASCII码是48-57
            let digit_0 = i8x16_splat(48); // '0'的ASCII码
            let digit_9 = i8x16_splat(57); // '9'的ASCII码

            while i + 16 <= len {
                let chunk = v128_load(bytes.as_ptr().add(i) as *const v128);
                // 检查是否在数字范围内
                let ge_0 = i8x16_ge(chunk, digit_0);
                let le_9 = i8x16_le(chunk, digit_9);
                let is_digit = v128_and(ge_0, le_9);
                
                let digit_mask = i8x16_bitmask(is_digit);
                
                if digit_mask != 0 {
                    // 找到连续的数字
                    let mut j = i;
                    while j < i + 16 && j < len {
                        if bytes[j] >= b'0' && bytes[j] <= b'9' {
                            let start = j;
                            while j < len && bytes[j] >= b'0' && bytes[j] <= b'9' {
                                j += 1;
                            }
                            
                            if j > start {
                                let num_str = std::str::from_utf8_unchecked(&bytes[start..j]);
                                if let Ok(num) = num_str.parse::<u32>() {
                                    result.push(num);
                                }
                            }
                        }
                        j += 1;
                    }
                }
                
                i += 16;
            }
            
            // 处理剩余字节
            while i < len {
                if bytes[i] >= b'0' && bytes[i] <= b'9' {
                    let start = i;
                    while i < len && bytes[i] >= b'0' && bytes[i] <= b'9' {
                        i += 1;
                    }
                    
                    if i > start {
                        let num_str = std::str::from_utf8_unchecked(&bytes[start..i]);
                        if let Ok(num) = num_str.parse::<u32>() {
                            result.push(num);
                        }
                    }
                }
                i += 1;
            }
            
            result
        }
        #[cfg(not(target_feature = "simd128"))]
        {
            // 降级处理：普通的数字提取
            let s = std::str::from_utf8_unchecked(bytes);
            s.split(|c: char| !c.is_ascii_digit())
                .filter(|s| !s.is_empty())
                .filter_map(|s| s.parse::<u32>().ok())
                .collect()
        }
    }

    /// SIMD优化的行列号提取
    unsafe fn simd_extract_line_column(&self, bytes: &[u8]) -> Vec<u32> {
        #[cfg(target_feature = "simd128")]
        {
            // 查找 "行:列" 格式的数字对
            let mut result = Vec::new();
            let mut numbers = self.simd_extract_numbers(bytes);
            
            // 如果是连续的两个数字，认为是行列号
            if numbers.len() >= 2 {
                for i in 0..numbers.len() - 1 {
                    result.push(numbers[i]);
                    result.push(numbers[i + 1]);
                }
            }
            
            result
        }
        #[cfg(not(target_feature = "simd128"))]
        {
            let s = std::str::from_utf8_unchecked(bytes);
            let mut result = Vec::new();
            // 用正则匹配行列号更可靠，但这里简单处理
            for part in s.split_whitespace() {
                if part.contains(':') {
                    let parts: Vec<&str> = part.split(':').collect();
                    if parts.len() >= 2 {
                        for p in parts {
                            if let Ok(num) = p.parse::<u32>() {
                                result.push(num);
                            }
                        }
                    }
                }
            }
            result
        }
    }
    
    /// SIMD优化的完整错误栈解析
    unsafe fn simd_parse_stack(&self, bytes: &[u8]) -> String {
        let s = std::str::from_utf8_unchecked(bytes);
        let mut result = String::new();
        
        #[cfg(target_feature = "simd128")]
        {
            use std::arch::wasm32::*;
            let len = bytes.len();
            let mut i = 0;
            
            // 使用SIMD检测 'at ' 关键词
            let at_byte = b'a';
            let t_byte = b't';
            let space_byte = b' ';
            
            // 字符比较用的掩码
            let at_mask = i8x16_splat(at_byte as i8);
            let t_mask = i8x16_splat(t_byte as i8);
            let space_mask = i8x16_splat(space_byte as i8);
            
            while i + 16 <= len {
                let chunk = v128_load(bytes.as_ptr().add(i) as *const v128);
                
                // 查找 'a' 字符
                let is_a = i8x16_eq(chunk, at_mask);
                let a_mask = i8x16_bitmask(is_a);
                
                if a_mask != 0 {
                    // 找到可能的 'at ' 序列
                    let mut j = i;
                    
                    while j < i + 16 && j + 3 < len {
                        if bytes[j] == at_byte && bytes[j+1] == t_byte && bytes[j+2] == space_byte {
                            // 找到 'at ' 标记
                            let mut line_start = j + 3;
                            
                            // 扫描找到文件路径和行列号
                            while line_start < len && bytes[line_start] != b'(' && bytes[line_start] != b'/' {
                                line_start += 1;
                            }
                            
                            if line_start < len {
                                // 查找行列号
                                let mut line_end = line_start;
                                while line_end < len && bytes[line_end] != b'\n' && bytes[line_end] != b'\r' {
                                    line_end += 1;
                                }
                                
                                // 提取这行信息
                                if line_end > line_start {
                                    let line_str = std::str::from_utf8_unchecked(&bytes[line_start..line_end]);
                                    // 查找冒号分隔的行列号
                                    if let Some(file_path) = line_str.trim_start_matches('(').trim_end_matches(')').split(':').next() {
                                        let path_parts: Vec<&str> = file_path.split('/').collect();
                                        if let Some(file_name) = path_parts.last() {
                                            // 找到文件名
                                            result.push_str(file_name);
                                            result.push(':');
                                            
                                            // 尝试提取行号
                                            if line_str.contains(':') {
                                                let parts: Vec<&str> = line_str.split(':').collect();
                                                if parts.len() > 1 {
                                                    result.push_str(parts[1]);
                                                    result.push('|');
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            
                            j = line_start;
                        }
                        j += 1;
                    }
                }
                
                i += 16;
            }
            
            // 处理剩余部分
            while i < len {
                if i + 3 < len && bytes[i] == at_byte && bytes[i+1] == t_byte && bytes[i+2] == space_byte {
                    // 同上，处理单个 'at ' 标记
                    let mut line_start = i + 3;
                    
                    while line_start < len && bytes[line_start] != b'(' && bytes[line_start] != b'/' {
                        line_start += 1;
                    }
                    
                    if line_start < len {
                        let mut line_end = line_start;
                        while line_end < len && bytes[line_end] != b'\n' && bytes[line_end] != b'\r' {
                            line_end += 1;
                        }
                        
                        if line_end > line_start {
                            let line_str = std::str::from_utf8_unchecked(&bytes[line_start..line_end]);
                            if let Some(file_path) = line_str.trim_start_matches('(').trim_end_matches(')').split(':').next() {
                                let path_parts: Vec<&str> = file_path.split('/').collect();
                                if let Some(file_name) = path_parts.last() {
                                    result.push_str(file_name);
                                    result.push(':');
                                    
                                    if line_str.contains(':') {
                                        let parts: Vec<&str> = line_str.split(':').collect();
                                        if parts.len() > 1 {
                                            result.push_str(parts[1]);
                                            result.push('|');
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    i = line_start;
                }
                i += 1;
            }
        }
        
        #[cfg(not(target_feature = "simd128"))]
        {
            // 降级处理：普通的栈解析
            for line in s.lines() {
                if line.contains(" at ") {
                    if let Some(file_info) = line.split(" at ").nth(1) {
                        if let Some(file_path) = file_info.trim_start_matches('(').trim_end_matches(')').split(':').next() {
                            let path_parts: Vec<&str> = file_path.split('/').collect();
                            if let Some(file_name) = path_parts.last() {
                                result.push_str(file_name);
                                result.push(':');
                                
                                if file_info.contains(':') {
                                    let parts: Vec<&str> = file_info.split(':').collect();
                                    if parts.len() > 1 {
                                        result.push_str(parts[1]);
                                        result.push('|');
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        result
    }
}
