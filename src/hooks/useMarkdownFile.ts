import { useCallback, useRef, useState } from 'react'
import { readMarkdownFile } from '../markdown/readMarkdownFile'
import { renderMarkdownToSafeHtml } from '../markdown/renderMarkdown'

type MarkdownFileStatus = 'idle' | 'loading' | 'success' | 'error'

interface MarkdownFileState {
  status: MarkdownFileStatus
  fileName: string | null
  fileSizeBytes: number | null
  html: string
  errorMessage: string | null
}

const initialState: MarkdownFileState = {
  status: 'idle',
  fileName: null,
  fileSizeBytes: null,
  html: '',
  errorMessage: null,
}

export function useMarkdownFile() {
  const [state, setState] = useState<MarkdownFileState>(initialState)
  const requestIdRef = useRef(0)

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setState(initialState)
  }, [])

  const openFile = useCallback((file: File) => {
    const requestId = (requestIdRef.current += 1)
    setState({ ...initialState, status: 'loading' })

    void (async () => {
      try {
        const rawMarkdown = await readMarkdownFile(file)
        if (requestIdRef.current !== requestId) return
        const html = renderMarkdownToSafeHtml(rawMarkdown)
        setState({
          status: 'success',
          fileName: file.name,
          fileSizeBytes: file.size,
          html,
          errorMessage: null,
        })
      } catch (error) {
        if (requestIdRef.current !== requestId) return
        setState({
          ...initialState,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unexpected error while reading the file.',
        })
      }
    })()
  }, [])

  return { state, openFile, reset }
}
