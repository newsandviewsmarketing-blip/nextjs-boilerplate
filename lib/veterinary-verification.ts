// Administrative cross-check only; this is NOT a PVMC live-registry validation.
export type VeterinaryCredential = {
  qualifications?: string | null;
  pvmc_number?: string | null;
  pvmc_verification_status?: string | null;
  verification_status?: string | null;
};
export function hasDocumentedVeterinaryQualification(value:string|null|undefined):boolean {
  const text=(value??"").trim();
  return /\bDVM\b|Doctor of Veterinary Medicine|Bachelor of Veterinary Science|B\.?\s*V\.?\s*Sc\.?/i.test(text);
}
export function credentialDataFlags(record:VeterinaryCredential):string[] {
  const flags:string[]=[];
  if(record.pvmc_verification_status!=="approved") return flags;
  if(!(record.pvmc_number??"").trim()) flags.push("PVMC approved without a registration number");
  if(!hasDocumentedVeterinaryQualification(record.qualifications)) flags.push("Recognized veterinary degree not documented in qualifications");
  return flags;
}
export function vetProfileApprovalProblem(qualifications:string|null|undefined):string|null {
  if(!hasDocumentedVeterinaryQualification(qualifications)) return "Provide a documented DVM or PVMC-recognized veterinary degree before veterinarian profile approval. Students and technical staff must use their appropriate category.";
  return null;
}
export function veterinaryCredentialApprovalProblem(record:VeterinaryCredential, evidence:string):string|null {
  if(record.verification_status!=="approved") return "The veterinarian profile must be reviewed first.";
  if(!(record.pvmc_number??"").trim()) return "PVMC registration number is required before marking the practitioner verified.";
  if(!hasDocumentedVeterinaryQualification(record.qualifications)) return "Document the DVM or PVMC-recognized veterinary qualification before credential approval.";
  if(evidence.trim().length<25) return "Record the official PVMC verification source, registration class, and evidence in a note of at least 25 characters.";
  return null;
}
