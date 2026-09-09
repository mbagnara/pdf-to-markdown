interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <strong>Something went wrong</strong>
      <p>{message}</p>
    </div>
  )
}
