"use client";
import { useRouter } from "next/navigation";
export default function RegistrationPathwaySelect({ value }: { value: string }) {
  const router = useRouter();
  return <div><label htmlFor="registration-pathway">Account type</label><select id="registration-pathway" value={value} onChange={event => {
    const next = event.target.value;
    router.push(next === "clinic" ? "/register?role=company&intent=clinic#registration" : "/register?role=" + encodeURIComponent(next) + "#registration", { scroll: false });
  }}>
    <option value="veterinarian">Registered Veterinarian</option><option value="candidate">Student / Job Seeker</option><option value="professional">Allied Industry Professional</option><option value="company">Company / Employer</option><option value="laboratory">Diagnostic Laboratory</option><option value="user">Animal Owner / Farmer / Pet Owner</option><option value="clinic">Clinic / Veterinary Hospital</option>
  </select><small>Changing category updates the selected card and relevant fields. Complete category-specific fields after choosing your pathway.</small></div>;
}
