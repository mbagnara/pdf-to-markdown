import { MarkdownFileTooLargeError, MAX_MARKDOWN_FILE_SIZE_MB, NotAMarkdownFileError } from './types'

const MARKDOWN_EXTENSION_REGEX = /\.(md|markdown|mdx)$/i

/** Throws a descriptive error when the file can't possibly be a Markdown file. */
export function validateMarkdownFile(file: File): void {
  const looksLikeMarkdown = MARKDOWN_EXTENSION_REGEX.test(file.name) || file.type === 'text/markdown'
  if (!looksLikeMarkdown) throw new NotAMarkdownFileError()
  const sizeMb = file.size / (1024 * 1024)
  if (sizeMb > MAX_MARKDOWN_FILE_SIZE_MB) throw new MarkdownFileTooLargeError(MAX_MARKDOWN_FILE_SIZE_MB)
}

/** Reads a Markdown file's text content entirely in the browser. */
export async function readMarkdownFile(file: File): Promise<string> {
  validateMarkdownFile(file)
  return file.text()
}
