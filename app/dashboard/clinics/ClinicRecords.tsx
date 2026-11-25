import { createClient } from "@/lib/supabase/server";
import FormSubmitButton from "@/app/components/FormSubmitButton";
import { createClinicRecordAction } from "./actions";

export default async function ClinicRecords({ clinicId }: { clinicId: string }) {
  const supabase = await createClient();
  const [customers, patients] = await Promise.all([
    supabase.from("clinic_customers").select("id, display_name, email, phone")
      .eq("clinic_id", clinicId).is("archived_at", null).order("display_name").limit(200),
    supabase.from("clinic_patients").select("id, display_name, kind, species, clinic_customers(display_name)")
      .eq("clinic_id", clinicId).is("archived_at", null).order("display_name").limit(200),
  ]);

  if (customers.error || patients.error) {
    return <p role="status">Clinic records are temporarily unavailable.</p>;
  }

  return (
    <section className="backend-form-card workspace-section-card">
      <h2>Customers & patients</h2>
      <p className="form-help">Private clinic records. The lists show up to 200 active records of each type.</p>
      <div className="workspace-two-column">
        <div>
          <h3>Customers</h3>
          {customers.data.length ? <ul>{customers.data.map(customer =>
            <li key={customer.id}>{customer.display_name}
              {[customer.email, customer.phone].filter(Boolean).map((value, index) => <div key={index}>{value}</div>)}
            </li>,
          )}</ul> : <p>No customers recorded.</p>}
          <details open={!customers.data.length}>
            <summary>Add customer</summary>
            <form action={createClinicRecordAction} className="form-grid">
              <input type="hidden" name="clinic_id" value={clinicId} />
              <input type="hidden" name="record" value="customer" />
              <label>Name<input name="display_name" maxLength={180} required /></label>
              <label>Email<input name="email" type="email" maxLength={254} /></label>
              <label>Phone<input name="phone" type="tel" maxLength={60} /></label>
              <FormSubmitButton pendingLabel="Saving customer...">Save customer</FormSubmitButton>
            </form>
          </details>
        </div>
        <div>
          <h3>Patients</h3>
          {patients.data.length ? <ul>{patients.data.map(patient => {
            const customer = Array.isArray(patient.clinic_customers)
              ? patient.clinic_customers[0] : patient.clinic_customers;
            return <li key={patient.id}>{patient.display_name} · {patient.species} · {patient.kind}
              {customer && <div>{customer.display_name}</div>}
            </li>;
          })}</ul> : <p>No patients recorded.</p>}
          {customers.data.length > 0 && <details>
            <summary>Add patient</summary>
            <form action={createClinicRecordAction} className="form-grid">
              <input type="hidden" name="clinic_id" value={clinicId} />
              <input type="hidden" name="record" value="patient" />
              <label>Customer
                <select name="customer_id" required defaultValue="">
                  <option value="" disabled>Choose customer</option>
                  {customers.data.map(customer => <option value={customer.id} key={customer.id}>{customer.display_name}</option>)}
                </select>
              </label>
              <label>Name<input name="display_name" maxLength={180} required /></label>
              <label>Type<select name="kind"><option value="animal">Animal</option><option value="herd">Herd</option><option value="flock">Flock</option></select></label>
              <label>Species<input name="species" maxLength={120} required /></label>
              <FormSubmitButton pendingLabel="Saving patient...">Save patient</FormSubmitButton>
            </form>
          </details>}
        </div>
      </div>
    </section>
  );
}
