"use client";

import { useEffect, useRef, type ComponentProps, type FormEvent } from "react";

type Props = ComponentProps<"form"> & {
  storageKey: string;
  clearSaved?: boolean;
};

type SavedValue = string | boolean;
type SavedForm = Record<string, SavedValue>;

function readControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): SavedValue | null {
  if (!control.name || control.type === "file") return null;
  if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
    return control.checked;
  }
  return control.value;
}

function restoreControl(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: SavedValue) {
  if (control.type === "file") return;
  if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
    control.checked = Boolean(value);
    return;
  }
  if (typeof value === "string") {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), "value")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export default function PersistentForm({ storageKey, clearSaved = false, onInput, onChange, ...props }: Props) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    if (clearSaved) {
      localStorage.removeItem(storageKey);
      return;
    }

    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as SavedForm;
      const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input[name],select[name],textarea[name]",
      );
      controls.forEach((control) => {
        const value = saved[control.name];
        if (value !== undefined) restoreControl(control, value);
      });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, clearSaved]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const saved: SavedForm = {};
    const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input[name],select[name],textarea[name]",
    );
    controls.forEach((control) => {
      const value = readControlValue(control);
      if (value !== null) saved[control.name] = value;
    });
    localStorage.setItem(storageKey, JSON.stringify(saved));
  };

  return (
    <form
      {...props}
      ref={ref}
      onInput={(event) => {
        save(event);
        onInput?.(event);
      }}
      onChange={(event) => {
        save(event);
        onChange?.(event);
      }}
    />
  );
}
