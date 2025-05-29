use criterion::{black_box, criterion_group, criterion_main, Criterion};
use perflite_wasm::parse_stack;

fn stack_parsing_benchmark(c: &mut Criterion) {
    let sample_stack = r#"Error: Something went wrong
    at Object.method (/path/to/file.js:10:15)
    at processTicksAndRejections (internal/process/task_queues.js:95:5)
    at async Promise.all (index 0)
    at async HTMLFormElement.submitForm (app.js:20:30)"#;

    c.bench_function("parse_stack", |b| {
        b.iter(|| parse_stack(black_box(sample_stack)))
    });

    // 测试复杂调用栈
    let complex_stack = r#"TypeError: Cannot read property 'length' of undefined
    at Module.callback (/node_modules/webpack/lib/Module.js:499:34)
    at Compilation.finish (/node_modules/webpack/lib/Compilation.js:1360:28)
    at hooks.make.callAsync.err (/node_modules/webpack/lib/Compiler.js:649:17)
    at AsyncSeriesHook.callAsync (/node_modules/tapable/lib/Hook.js:35:21)
    at Compilation.seal (/node_modules/webpack/lib/Compilation.js:1285:27)
    at hooks.renderManifest.callAsync.err (/node_modules/webpack/lib/Compilation.js:1252:9)
    at AsyncSeriesHook.callAsync (/node_modules/tapable/lib/Hook.js:35:21)
    at hooks.processFinalizedModules.callAsync.err (/node_modules/webpack/lib/Compilation.js:1141:26)
    at AsyncSeriesHook.callAsync (/node_modules/tapable/lib/Hook.js:35:21)
    at Compilation.nextStepInChainModule (/node_modules/webpack/lib/Compilation.js:1037:10)"#;

    c.bench_function("parse_complex_stack", |b| {
        b.iter(|| parse_stack(black_box(complex_stack)))
    });

    // SIMD加速版本测试（如果可用）
    #[cfg(feature = "simd")]
    {
        use perflite_wasm::parse_stack_simd;
        c.bench_function("parse_stack_simd", |b| {
            b.iter(|| parse_stack_simd(black_box(sample_stack)))
        });
    }
}

criterion_group!(benches, stack_parsing_benchmark);
criterion_main!(benches);
