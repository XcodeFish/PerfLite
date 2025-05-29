import { ErrorParser } from '../src/core/ErrorParser';

describe('ErrorParser', () => {
  let errorParser: ErrorParser;

  beforeEach(() => {
    errorParser = new ErrorParser();
  });

  test('should parse simple error stack correctly', async () => {
    const stack = `Error: Test error
        at functionName (file.js:10:5)
        at anotherFunction (file.js:15:10)`;
    
    const result = await errorParser.parse(stack);
    expect(result).toBeDefined();
    expect(result).toMatch(/functionName/);
  });

  test('should call DeepSeek API for complex errors', async () => {
    const complexStack = `Error: Complex error
        at functionA (fileA.js:1:1)
        at functionB (fileB.js:2:2)
        at functionC (fileC.js:3:3)
        at functionD (fileD.js:4:4)
        at functionE (fileE.js:5:5)`;
    
    const result = await errorParser.parse(complexStack);
    expect(result).toBeDefined();
    expect(result).toHaveProperty('apiResponse');
  });

  test('should return cached result for previously parsed stack', async () => {
    const stack = `Error: Cached error
        at functionX (fileX.js:20:5)`;
    
    await errorParser.parse(stack);
    const cachedResult = await errorParser.parse(stack);
    expect(cachedResult).toBeDefined();
    expect(cachedResult).toMatch(/functionX/);
  });
});