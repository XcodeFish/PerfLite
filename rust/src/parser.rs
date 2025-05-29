use wasm_bindgen::prelude::*;
use regex::Regex;

#[wasm_bindgen]
pub struct ErrorParser {
    line_regex: String,
}

#[wasm_bindgen]
impl ErrorParser {
    pub fn new() -> Self {
        ErrorParser {
            line_regex: r"at\s+(\S+)\s+\((.*):(\d+):(\d+)\)".to_string(),
        }
    }

    pub fn parse(&self, stack: &str) -> String {
        if stack.is_empty() {
            return String::new();
        }

        // 简单实现，后续完善
        stack.to_string()
    }

    #[wasm_bindgen]
    pub fn parse_simd(&self, stack: &str) -> Vec<u32> {
        if stack.is_empty() {
            return vec![];
        }
        let bytes = stack.as_bytes();
        unsafe { self.simd_parse(bytes) }
    }

    unsafe fn simd_parse(&self, bytes: &[u8]) -> Vec<u32> {
        #[cfg(target_feature = "simd128")]
        {
            use std::arch::wasm32::*;
            let mut result = Vec::new();
            let len = bytes.len();
            let mut i = 0;

            while i + 16 <= len {
                let chunk = v128_load(bytes.as_ptr().add(i) as *const v128);
                // 查找数字的SIMD实现
                let digit_mask = i8x16_eq(chunk, v128_const(48, 49, 50, 51, 52, 53, 54, 55, 56, 57));
                
                if !u8x16_all_true(digit_mask) {
                    let pos = i8x16_bitmask(digit_mask) as usize;
                    if pos > 0 {
                        // 提取数字
                        let num_str = std::str::from_utf8_unchecked(
                            &bytes[i..i + pos]
                        );
                        if let Ok(num) = num_str.parse::<u32>() {
                            result.push(num);
                        }
                    }
                }
                i += 16;
            }
            
            // 处理剩余字节
            while i < len {
                if bytes[i].is_ascii_digit() {
                    let start = i;
                    while i < len && bytes[i].is_ascii_digit() {
                        i += 1;
                    }
                    let num_str = std::str::from_utf8_unchecked(&bytes[start..i]);
                    if let Ok(num) = num_str.parse::<u32>() {
                        result.push(num);
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
                .filter_map(|s| s.parse::<u32>().ok())
                .collect()
        }
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
        assert_eq!(result, "/src/App.js:10:20|");
    }

    #[test]
    fn test_parse_simd() {
        let parser = ErrorParser::new();
        let stack = "Error: test\n at Component (/src/App.js:10:20)";
        let result = parser.parse_simd(stack);
        assert!(result.contains(&10));
        assert!(result.contains(&20));
    }
}