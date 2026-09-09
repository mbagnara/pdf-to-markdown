export const MAX_MARKDOWN_FILE_SIZE_MB = 10

export class NotAMarkdownFileError extends Error {
  constructor() {
    super('The selected file is not a Markdown file.')
    this.name = 'NotAMarkdownFileError'
  }
}

export class MarkdownFileTooLargeError extends Error {
  constructor(limitMb: number) {
    super(`This file exceeds the ${String(limitMb)} MB size limit.`)
    this.name = 'MarkdownFileTooLargeError'
  }
}
