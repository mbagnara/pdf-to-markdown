import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { MAX_FILE_SIZE_MB } from '../pdf/constants'

interface PdfDropzoneProps {
  onFileSelected: (file: File) => void
}

export function PdfDropzone({ onFileSelected }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const openFileDialog = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
      const file = event.dataTransfer.files[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        openFileDialog()
      }
    },
    [openFileDialog],
  )

  return (
    <div
      className={`dropzone${isDragOver ? ' dropzone-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Drop a PDF here or press Enter to choose a file. Maximum size ${String(MAX_FILE_SIZE_MB)} megabytes.`}
      onClick={openFileDialog}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => {
        setIsDragOver(false)
      }}
      onDrop={handleDrop}
    >
      <p className="dropzone-title">Drag and drop a PDF here</p>
      <p className="dropzone-subtitle">or click to choose a file</p>
      <p className="dropzone-limit">Maximum size: {MAX_FILE_SIZE_MB} MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileSelected(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
