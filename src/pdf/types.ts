export type RunStyle = 'normal' | 'bold' | 'italic' | 'boldItalic' | 'code'

export interface ExtractedRun {
  text: string
  style: RunStyle
  linkUrl: string | null
}

export interface ExtractedLine {
  runs: ExtractedRun[]
  fontSize: number
  y: number
}

export interface ExtractedPage {
  pageNumber: number
  lines: ExtractedLine[]
  hasText: boolean
}

export interface PdfMetadata {
  fileName: string
  fileSizeBytes: number
  pageCount: number
}

export interface ExtractedDocument {
  metadata: PdfMetadata
  pages: ExtractedPage[]
}

export interface ConversionWarning {
  code: 'scanned-page'
  message: string
}

export interface MarkdownConversionResult {
  markdown: string
  plainText: string
  warnings: ConversionWarning[]
}

export class ScannedPdfError extends Error {
  constructor() {
    super('This PDF appears to be scanned and requires OCR, which is not supported yet.')
    this.name = 'ScannedPdfError'
  }
}

export class EmptyPdfError extends Error {
  constructor() {
    super('This PDF has no pages.')
    this.name = 'EmptyPdfError'
  }
}

export class PdfTooLargeError extends Error {
  constructor(limitMb: number) {
    super(`This file exceeds the ${String(limitMb)} MB size limit.`)
    this.name = 'PdfTooLargeError'
  }
}

export class NotAPdfError extends Error {
  constructor() {
    super('The selected file is not a PDF.')
    this.name = 'NotAPdfError'
  }
}

export class PasswordProtectedError extends Error {
  constructor() {
    super('This PDF is password-protected and cannot be processed.')
    this.name = 'PasswordProtectedError'
  }
}

export class CorruptPdfError extends Error {
  constructor(detail?: string) {
    super(
      detail
        ? `This PDF file appears to be corrupted or unreadable (${detail}).`
        : 'This PDF file appears to be corrupted or unreadable.',
    )
    this.name = 'CorruptPdfError'
  }
}
