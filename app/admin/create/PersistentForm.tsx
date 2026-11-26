"use client";

import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";

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
  if (!control.name || control.disabled || control.getAttribute("data-draft") !== "allow") return null;
  if (["file", "password", "hidden", "email", "tel"].includes(control.type)) return null;
  if (control instanceof HTMLSelectElement && control.multiple) return JSON.stringify(Array.from(control.selectedOptions, option => option.value));
  if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
    return control.checked;
  }
  return control.value;
}

function restoreControl(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: SavedValue) {
  if (control instanceof HTMLSelectElement && control.multiple) {
    if (typeof value !== "string") return;
    let selected: unknown;
    try { selected = JSON.parse(value); } catch { return; }
    if (!Array.isArray(selected) || !selected.every(item => typeof item === "string")) return;
    const values = new Set(selected);
    for (const option of Array.from(control.options)) option.selected = values.has(option.value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (control.type === "file") return;
  if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
    if (typeof value !== "boolean") return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (typeof value === "string") {
    if (control instanceof HTMLSelectElement && !Array.from(control.options).some(option => option.value === value)) return;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), "value")?.set;
    setter?.call(control, value);
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export default function PersistentForm({ storageKey, clearSaved = false, onInput, onChange, onSubmit, ...props }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const restoring = useRef(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saved" | "error">("idle");

  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    let active = true;
    const publishStatus = (status: "idle" | "saved" | "error") => {
      queueMicrotask(() => { if (active) setDraftStatus(status); });
    };
    restoring.current = true;
    publishStatus("idle");
    try {
    if (clearSaved) {
      sessionStorage.removeItem(storageKey);
      return () => { active = false; };
    }

    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return () => { active = false; };
    try {
      const saved = JSON.parse(raw) as SavedForm;
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) { publishStatus("error"); return () => { active = false; }; }
      const controls = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input[name],select[name],textarea[name]",
      );
      const offsets = new Map<string, number>();
      controls.forEach((control) => {
        if (readControlValue(control) === null) return;
        const key = controlKey(control);
        const values = Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] : undefined;
        const offset = offsets.get(key) ?? 0;
        offsets.set(key, offset + 1);
        const value = Array.isArray(values) ? values[offset] : offset === 0 ? values : undefined;
        if (typeof value === "string" || typeof value === "boolean") restoreControl(control, value);
      });
      publishStatus("saved");
    } catch {
      publishStatus("error");
      // Preserve unreadable drafts rather than silently deleting them.
    }
    } catch {
      publishStatus("error");
      // Storage may be disabled; the form must remain usable.
    } finally {
      restoring.current = false;
    }
    return () => { active = false; };
  }, [storageKey, clearSaved]);

  const save = (event: FormEvent<HTMLFormElement>) => {
    if (restoring.current) return;
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
      sessionStorage.setItem(storageKey, JSON.stringify(saved));
      setDraftStatus("saved");
    } catch {
      setDraftStatus("error");
      // Keep entered values in the form when browser storage is unavailable.
    }
  };

  return (
    <form
      {...props}
      data-draft-status={draftStatus}
      ref={ref}
      onSubmit={(event) => {
        save(event);
        onSubmit?.(event);
      }}
      onInput={(event) => {
        save(event);
        onInput?.(event);
      }}
      onChange={(event) => {
        save(event);
        onChange?.(event);
      }}
    >
      {props.children}
      <p className="form-help form-span-2" role="status" aria-live="polite">{draftStatus === "saved" ? "Selected fields saved for this browser session." : draftStatus === "error" ? "Draft could not be read or saved. Keep this page open and check your entries before continuing." : "Selected non-sensitive fields can be recovered in this browser session."}</p>
    </form>
  );
}
