import { useCallback, useRef, useState } from 'react'
import { convertDocumentToMarkdown } from '../pdf/convertToMarkdown'
import type { ExtractionProgress } from '../pdf/extractPdf'
import type { ConversionWarning, PdfMetadata } from '../pdf/types'

type ConversionStatus = 'idle' | 'loading' | 'success' | 'error'

interface ConversionState {
  status: ConversionStatus
  progress: ExtractionProgress | null
  metadata: PdfMetadata | null
  markdown: string
  plainText: string
  warnings: ConversionWarning[]
  errorMessage: string | null
}

const initialState: ConversionState = {
  status: 'idle',
  progress: null,
  metadata: null,
  markdown: '',
  plainText: '',
  warnings: [],
  errorMessage: null,
}

export function usePdfConversion() {
  const [state, setState] = useState<ConversionState>(initialState)
  const requestIdRef = useRef(0)

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setState(initialState)
  }, [])

  const convertFile = useCallback((file: File) => {
    const requestId = (requestIdRef.current += 1)
    setState({ ...initialState, status: 'loading' })

    void (async () => {
      try {
        const { extractPdfDocument } = await import('../pdf/extractPdf')
        const document = await extractPdfDocument(file, (progress) => {
          if (requestIdRef.current !== requestId) return
          setState((prev) => (prev.status === 'loading' ? { ...prev, progress } : prev))
        })
        if (requestIdRef.current !== requestId) return

        const { markdown, plainText, warnings } = convertDocumentToMarkdown(document)
        setState({
          status: 'success',
          progress: null,
          metadata: document.metadata,
          markdown,
          plainText,
          warnings,
          errorMessage: null,
        })
      } catch (error) {
        if (requestIdRef.current !== requestId) return
        setState({
          ...initialState,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unexpected error while processing the PDF.',
        })
      }
    })()
  }, [])

  const setMarkdown = useCallback((markdown: string) => {
    setState((prev) => (prev.status === 'success' ? { ...prev, markdown } : prev))
  }, [])

  return { state, convertFile, reset, setMarkdown }
}
