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
}
