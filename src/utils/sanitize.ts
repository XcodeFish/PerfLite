export function sanitize(stack: string): string {
  return stack.replace(/(password|token)=[^&]+/g, '[REDACTED]');
}