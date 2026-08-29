import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import FormMessage from "../../components/FormMessage";
import FormSubmitButton from "../../components/FormSubmitButton";
import AdminNav from "../components/AdminNav";
import { requireAdminPermission } from "@/lib/admin";
import { loadMasterData, masterDataCategories } from "@/lib/master-data";
import { createMasterDataAction, toggleMasterDataAction } from "./actions";

export const dynamic = "force-dynamic";

type Params = { error?: string; message?: string; category?: string };

export default async function AdminDataPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const identity = await requireAdminPermission("master_data.manage", "/admin/data");
  const { items, error } = await loadMasterData();
  const selected = params.category ?? "all";
  const rows = selected === "all" ? items : items.filter((item) => item.category === selected);
  const parents = items.filter((item) => item.is_active);

  return <main>
    <SiteHeader />
    <section className="dashboard-hero"><div className="shell"><span className="section-kicker">MASTER DATA STUDIO</span><h1>Change controlled lists without changing code.</h1><p>Add cities, sectors, services, packaging, vaccine types, laboratory tests, job sectors and other reusable options.</p></div></section>
    <section className="section compact-section"><div className="shell admin-control-layout">
      <AdminNav roles={identity.roles} />
      <div className="admin-control-content">
        <FormMessage error={params.error || error?.message} message={params.message} />
        <div className="section-heading"><span className="section-kicker">ADD OPTION</span><h2>Create a reusable database option.</h2><p>Use Parent for dependent lists, for example District → Province, City → Tehsil, or Specialization → Veterinary Sector.</p></div>
        <form className="profile-form admin-master-form" action={createMasterDataAction}>
          <div><label htmlFor="category">Category</label><select id="category" name="category" required><option value="">Select category</option>{masterDataCategories.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div><label htmlFor="label">Display label</label><input id="label" name="label" required placeholder="e.g. Faisalabad City" /></div>
          <div><label htmlFor="code">Code (optional)</label><input id="code" name="code" placeholder="e.g. faisalabad" /></div>
          <div><label htmlFor="parent_id">Parent option (optional)</label><select id="parent_id" name="parent_id"><option value="">No parent</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.category.replaceAll("_"," ")} → {item.label}</option>)}</select></div>
          <div><label htmlFor="sort_order">Sort order</label><input id="sort_order" name="sort_order" type="number" defaultValue="0" /></div>
          <div className="form-span-2"><label htmlFor="description">Description / internal note</label><textarea id="description" name="description" rows={2} /></div>
          <FormSubmitButton className="button button-primary form-span-2" pendingLabel="Adding...">Add master-data option</FormSubmitButton>
        </form>

        <div className="management-links master-data-filters">
          <a className={`button ${selected === "all" ? "button-primary" : "button-secondary"}`} href="/admin/data">All</a>
          {masterDataCategories.map(([value,label]) => <a className={`button ${selected === value ? "button-primary" : "button-secondary"}`} href={`/admin/data?category=${encodeURIComponent(value)}`} key={value}>{label}</a>)}
        </div>

        <div className="admin-directory-table-wrap">
          <table className="admin-directory-table"><thead><tr><th>Category</th><th>Label</th><th>Parent</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{rows.map((item) => {
              const parent = item.parent_id ? items.find((candidate) => candidate.id === item.parent_id) : null;
              return <tr key={item.id}><td>{item.category.replaceAll("_"," ")}</td><td><b>{item.label}</b><small>{item.code || ""}</small></td><td>{parent?.label || "—"}</td><td>{item.is_active ? "Active" : "Inactive"}</td><td><form action={toggleMasterDataAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="is_active" value={item.is_active ? "false" : "true"} /><button className="button button-secondary" type="submit">{item.is_active ? "Deactivate" : "Activate"}</button></form></td></tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div></section>
    <SiteFooter />
  </main>;
}
