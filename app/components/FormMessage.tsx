export default function FormMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (!error && !message) return null;
  return (
    <p
      className={`form-message ${error ? "form-message-error" : "form-message-success"}`}
      role="status"
    >
      {error ?? message}
    </p>
  );
}
