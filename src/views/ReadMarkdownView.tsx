import { useMemo, useState } from 'react'
import { ErrorMessage } from '../components/ErrorMessage'
import { FileDropzone } from '../components/FileDropzone'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { useMarkdownFile } from '../hooks/useMarkdownFile'
import { downloadTextFile } from '../markdown/downloadMarkdown'
import { renderMarkdownToSafeHtml } from '../markdown/renderMarkdown'
import { MAX_MARKDOWN_FILE_SIZE_MB } from '../markdown/types'

interface ReadMarkdownViewProps {
  onBack: () => void
}

type ViewMode = 'preview' | 'edit'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(2)} MB`
}

export function ReadMarkdownView({ onBack }: ReadMarkdownViewProps) {
  const { state, openFile, reset, setRawMarkdown } = useMarkdownFile()
  const [mode, setMode] = useState<ViewMode>('preview')

  const html = useMemo(() => renderMarkdownToSafeHtml(state.rawMarkdown), [state.rawMarkdown])

  const dropzone = (
    <FileDropzone
      onFileSelected={openFile}
      accept=".md,.markdown,.mdx,text/markdown"
      title="Drag and drop a Markdown file here"
      subtitle="or click to choose a file"
      limitLabel={`Maximum size: ${String(MAX_MARKDOWN_FILE_SIZE_MB)} MB`}
      ariaLabel={`Drop a Markdown file here or press Enter to choose a file. Maximum size ${String(MAX_MARKDOWN_FILE_SIZE_MB)} megabytes.`}
    />
  )

  const handleDownload = () => {
    downloadTextFile(state.rawMarkdown, state.fileName ?? 'document.md')
  }

  return (
    <div className="view">
      <button type="button" className="back-link" onClick={onBack}>
        ← Back to menu
      </button>
      <h1 className="view-title">Read a Markdown file</h1>

      {state.status === 'idle' && dropzone}

      {state.status === 'error' && (
        <div className="state-stack">
          <ErrorMessage message={state.errorMessage ?? 'Unknown error.'} />
          {dropzone}
        </div>
      )}

      {state.status === 'loading' && (
        <p role="status" aria-live="polite">
          Reading file…
        </p>
      )}

      {state.status === 'success' && (
        <div className="markdown-reader">
          <div className="markdown-reader-toolbar">
            <span className="markdown-reader-filename">
              {state.fileName}
              {state.fileSizeBytes !== null && ` · ${formatFileSize(state.fileSizeBytes)}`}
            </span>
            <div className="markdown-reader-toolbar-actions">
              <div className="mode-switch" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={mode === 'preview' ? 'mode-switch-button mode-switch-button-active' : 'mode-switch-button'}
                  aria-pressed={mode === 'preview'}
                  onClick={() => {
                    setMode('preview')
                  }}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className={mode === 'edit' ? 'mode-switch-button mode-switch-button-active' : 'mode-switch-button'}
                  aria-pressed={mode === 'edit'}
                  onClick={() => {
                    setMode('edit')
                  }}
                >
                  Edit
                </button>
              </div>
              <button type="button" onClick={handleDownload}>
                Download .md
              </button>
              <button type="button" className="button-secondary" onClick={reset}>
                Read another file
              </button>
            </div>
          </div>

          {mode === 'preview' && <MarkdownPreview html={html} />}

          {mode === 'edit' && (
            <div className="results">
              <section className="results-panel" aria-label="Markdown source">
                <MarkdownEditor value={state.rawMarkdown} onChange={setRawMarkdown} />
              </section>
              <section className="results-panel" aria-label="Rendered preview">
                <span className="markdown-editor-label">Preview</span>
                <MarkdownPreview html={html} />
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
