/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_stackframe_free: (a: number, b: number) => void;
export const stackframe_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
export const stackframe_function_name: (a: number) => [number, number];
export const stackframe_file_name: (a: number) => [number, number];
export const stackframe_line_number: (a: number) => number;
export const stackframe_column_number: (a: number) => number;
export const __wbg_errorparser_free: (a: number, b: number) => void;
export const errorparser_new: () => number;
export const errorparser_parse: (a: number, b: number, c: number) => [number, number];
export const errorparser_parse_simd: (a: number, b: number, c: number) => [number, number];
export const __wbg_simdparser_free: (a: number, b: number) => void;
export const simdparser_new: () => number;
export const simdparser_parse_numbers: (a: number, b: number, c: number) => [number, number];
export const simdparser_parse_line_column: (a: number, b: number, c: number) => [number, number];
export const simdparser_parse_stack_simd: (a: number, b: number, c: number) => [number, number];
export const parse: (a: number, b: number) => [number, number];
export const parse_numbers_simd: (a: number, b: number) => [number, number];
export const parse_stack_simd: (a: number, b: number) => [number, number];
export const parse_line_column_simd: (a: number, b: number) => [number, number];
export const get_version: () => [number, number];
export const is_simd_enabled: () => number;
export const init_parser: () => void;
export const init_simd_parser: () => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_export_3: WebAssembly.Table;
export const __externref_drop_slice: (a: number, b: number) => void;
export const __wbindgen_start: () => void;
