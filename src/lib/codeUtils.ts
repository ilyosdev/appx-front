/**
 * Check if content is React code (vs HTML).
 */
export function isReactCode(content: string | null | undefined): boolean {
  if (!content) return false;
  return (
    content.includes("'use client'") ||
    content.includes('"use client"') ||
    (content.includes('export default') && content.includes('import '))
  );
}
