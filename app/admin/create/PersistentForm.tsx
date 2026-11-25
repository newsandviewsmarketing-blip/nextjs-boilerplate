"use client";

import { useEffect, useRef, type ComponentProps, type FormEvent } from "react";

type Props = ComponentProps<"form"> & {
  storageKey: string;
  clearSaved?: boolean;
};

type SavedValue = string | boolean;
type SavedForm = Record<string, SavedValue | SavedValue[]>;

function controlKey(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  return control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")
    ? JSON.stringify([control.name, control.type, control.value]) : control.name;
}

function readControlValue(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): SavedValue | null {
  if (!control.name || control.type === "file" || control.type === "password" || control.disabled) return null;
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
  const restoring = useRef(false);

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    restoring.current = true;
    try {
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
      const offsets = new Map<string, number>();
      controls.forEach((control) => {
        if (readControlValue(control) === null) return;
        const key = controlKey(control);
        const values = saved[key];
        const offset = offsets.get(key) ?? 0;
        offsets.set(key, offset + 1);
        const value = Array.isArray(values) ? values[offset] : offset === 0 ? values : undefined;
        if (typeof value === "string" || typeof value === "boolean") restoreControl(control, value);
      });
    } catch {
      // Preserve unreadable drafts rather than silently deleting them.
    }
    } catch {
      // Storage may be disabled; the form must remain usable.
    } finally {
      restoring.current = false;
    }
  }, [storageKey, clearSaved]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    if (restoring.current || clearSaved) return;
    const form = event.currentTarget;
    const saved: SavedForm = Object.create(null);
    const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input[name],select[name],textarea[name]",
    );
    controls.forEach((control) => {
      const value = readControlValue(control);
      if (value !== null) {
        const key = controlKey(control);
        const previous = saved[key];
        saved[key] = previous === undefined ? [value] : Array.isArray(previous) ? [...previous, value] : [previous, value];
      }
    });
    try {
      localStorage.setItem(storageKey, JSON.stringify(saved));
    } catch {
      // Keep entered values in the form when browser storage is unavailable.
    }
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
