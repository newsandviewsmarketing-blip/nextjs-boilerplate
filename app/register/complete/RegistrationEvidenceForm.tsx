"use client";

import { useState, type FormEvent } from "react";
import FormMessage from "../../components/FormMessage";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPTED_REGISTRATION_EVIDENCE_TYPES,
  MAX_REGISTRATION_EVIDENCE_BYTES,
  REGISTRATION_EVIDENCE_BUCKET,
  type EvidenceRequirement,
} from "@/lib/registration-evidence";
import { completeRegistrationAction } from "./actions";

const accept = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "evidence";

export default function RegistrationEvidenceForm({ requirements }: { requirements: EvidenceRequirement[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = createClient();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const cnic = String(data.get("cnic_number") ?? "").trim();
    const selected: Array<{ type: string; file: File }> = [];
    for (const type of ["cnic_front", "cnic_back", ...requirements.map((item) => item.type)]) {
      const value = data.get(type);
      if (!(value instanceof File) || !value.size) {
        setError("Please choose every required document before continuing.");
        setBusy(false);
        return;
      }
      if (!ACCEPTED_REGISTRATION_EVIDENCE_TYPES.includes(value.type as (typeof ACCEPTED_REGISTRATION_EVIDENCE_TYPES)[number])) {
        setError("Use a PDF, JPG, PNG or WebP file for each document.");
        setBusy(false);
        return;
      }
      if (value.size > MAX_REGISTRATION_EVIDENCE_BYTES) {
        setError("Each document must be 8 MB or smaller.");
        setBusy(false);
        return;
      }
      selected.push({ type, file: value });
    }

    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) {
      setError("Your sign-in session has expired. Sign in and continue registration again.");
      setBusy(false);
      return;
    }

    const uploaded: string[] = [];
    try {
      const evidence: Array<{ type: string; path: string; filename: string }> = [];
      for (const item of selected) {
        const path = auth.user.id + "/" + crypto.randomUUID() + "-" + safeName(item.file.name);
        const result = await client.storage.from(REGISTRATION_EVIDENCE_BUCKET).upload(path, item.file, {
          contentType: item.file.type,
          upsert: false,
        });
        if (result.error) throw new Error(result.error.message);
        uploaded.push(path);
        evidence.push({ type: item.type, path, filename: safeName(item.file.name) });
      }

      const submission = new FormData();
      submission.set("cnic_number", cnic);
      for (const item of evidence) submission.append("evidence", JSON.stringify(item));
      await completeRegistrationAction(submission);
    } catch (reason) {
      if (uploaded.length) await client.storage.from(REGISTRATION_EVIDENCE_BUCKET).remove(uploaded);
      setError(reason instanceof Error ? reason.message : "The private upload failed. Please retry.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <FormMessage error={error} />
      <div className="form-grid">
        <div>
          <label htmlFor="cnic-number">CNIC number *</label>
          <input id="cnic-number" name="cnic_number" required inputMode="numeric" autoComplete="off" placeholder="12345-1234567-1" pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" maxLength={15} />
        </div>
        <div><label htmlFor="cnic-front">CNIC front *</label><input id="cnic-front" name="cnic_front" type="file" accept={accept} required /></div>
        <div><label htmlFor="cnic-back">CNIC back *</label><input id="cnic-back" name="cnic_back" type="file" accept={accept} required /></div>
        {requirements.map((item) => <div key={item.type}><label htmlFor={item.type}>{item.label} *</label><input id={item.type} name={item.type} type="file" accept={accept} required /></div>)}
      </div>
      <p className="form-help">Maximum 8 MB per file. Accepted formats: PDF, JPG, PNG and WebP. Files upload directly to private storage and are never sent through the website server or shown on public profiles.</p>
      <button className="button button-primary button-full" type="submit" disabled={busy}>{busy ? "Uploading securely..." : "Submit registration documents"}</button>
    </form>
  );
}
