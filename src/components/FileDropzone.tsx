import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

interface FileDropzoneProps {
  onFileSelected: (file: File) => void
  accept: string
  title: string
  subtitle: string
  limitLabel: string
  ariaLabel: string
}

export function FileDropzone({ onFileSelected, accept, title, subtitle, limitLabel, ariaLabel }: FileDropzoneProps) {
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
      aria-label={ariaLabel}
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
      <p className="dropzone-title">{title}</p>
      <p className="dropzone-subtitle">{subtitle}</p>
      <p className="dropzone-limit">{limitLabel}</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
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
