export default function FormMessage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  if (!error && !message) return null;

  const isError = Boolean(error);
  return (
    <p
      className={`form-message ${isError ? "form-message-error" : "form-message-success"}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {error ?? message}
    </p>
  );
}
