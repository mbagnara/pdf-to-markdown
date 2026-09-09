import { useCallback, useEffect, useState } from 'react'
import { ConversionProgress } from '../components/ConversionProgress'
import { ErrorMessage } from '../components/ErrorMessage'
import { FileDropzone } from '../components/FileDropzone'
import { FileSummary } from '../components/FileSummary'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { usePdfConversion } from '../hooks/usePdfConversion'
import { MAX_FILE_SIZE_MB } from '../pdf/constants'

type CopyStatus = 'idle' | 'copied' | 'failed'

interface ConvertPdfViewProps {
  onBack: () => void
}

function downloadMarkdown(markdown: string, fileName: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function markdownFileName(pdfFileName: string): string {
  const base = pdfFileName.replace(/\.pdf$/i, '').trim()
  return `${base.length > 0 ? base : 'document'}.md`
}

export function ConvertPdfView({ onBack }: ConvertPdfViewProps) {
  const { state, convertFile, reset, setMarkdown } = usePdfConversion()
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  useEffect(() => {
    if (copyStatus === 'idle') return
    const timeoutId = window.setTimeout(() => {
      setCopyStatus('idle')
    }, 2000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyStatus])

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(state.markdown)
      .then(() => {
        setCopyStatus('copied')
      })
      .catch(() => {
        setCopyStatus('failed')
      })
  }, [state.markdown])

  const handleDownload = useCallback(() => {
    downloadMarkdown(state.markdown, markdownFileName(state.metadata?.fileName ?? 'document.pdf'))
  }, [state.markdown, state.metadata])

  const dropzone = (
    <FileDropzone
      onFileSelected={convertFile}
      accept="application/pdf,.pdf"
      title="Drag and drop a PDF here"
      subtitle="or click to choose a file"
      limitLabel={`Maximum size: ${String(MAX_FILE_SIZE_MB)} MB`}
      ariaLabel={`Drop a PDF here or press Enter to choose a file. Maximum size ${String(MAX_FILE_SIZE_MB)} megabytes.`}
    />
  )

  return (
    <div className="view">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to menu
      </button>
      <h1 className="view-title">Convert PDF to Markdown</h1>

      {state.status === 'idle' && dropzone}

      {state.status === 'error' && (
        <div className="state-stack">
          <ErrorMessage message={state.errorMessage ?? 'Unknown error.'} />
          {dropzone}
        </div>
      )}

      {state.status === 'loading' && (
        <ConversionProgress
          pagesProcessed={state.progress?.pagesProcessed ?? 0}
          totalPages={state.progress?.totalPages ?? 0}
        />
      )}

      {state.status === 'success' && state.metadata && (
        <div className="results">
          <section className="results-panel" aria-label="File information and extracted text">
            <FileSummary
              fileName={state.metadata.fileName}
              fileSizeBytes={state.metadata.fileSizeBytes}
              pageCount={state.metadata.pageCount}
            />
            {state.warnings.length > 0 && (
              <ul className="warnings-list">
                {state.warnings.map((warning) => (
                  <li key={warning.message}>{warning.message}</li>
                ))}
              </ul>
            )}
            <h2 className="panel-heading">Extracted text</h2>
            <pre className="extracted-text">{state.plainText}</pre>
          </section>

          <section className="results-panel" aria-label="Markdown output">
            <MarkdownEditor value={state.markdown} onChange={setMarkdown} />
            <div className="actions">
              <button type="button" onClick={handleCopy}>
                {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'failed' ? 'Copy failed' : 'Copy Markdown'}
              </button>
              <button type="button" onClick={handleDownload}>
                Download .md
              </button>
              <button type="button" className="button-secondary" onClick={reset}>
                Convert another PDF
              </button>
            </div>
            <p className="status-line" role="status" aria-live="polite">
              {copyStatus === 'copied' && 'Markdown copied to clipboard.'}
              {copyStatus === 'failed' && 'Could not copy to clipboard.'}
            </p>
          </section>
        </div>
      )}
    </div>
  )
}
