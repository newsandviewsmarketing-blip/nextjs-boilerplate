"use client";

import { useFormStatus } from "react-dom";

export default function FormSubmitButton({
  children,
  pendingLabel = "Please wait...",
  className = "button button-primary button-full",
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      name={name}
      value={value}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
