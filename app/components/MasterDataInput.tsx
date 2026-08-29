"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string; parent_id?: string | null };

export default function MasterDataInput({
  category,
  name,
  label,
  defaultValue = "",
  placeholder = "Select option",
  required = false,
  parentId,
  allowCustom = true,
}: {
  category: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  parentId?: string;
  allowCustom?: boolean;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const params = new URLSearchParams({ category });
    if (parentId) params.set("parent_id", parentId);
    fetch(`/api/master-data?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((payload) => setItems(payload.items ?? []))
      .catch(() => setItems([]));
  }, [category, parentId]);

  const listId = `master-${name.replace(/[^a-z0-9_-]/gi, "-")}`;
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      {allowCustom ? (
        <>
          <input id={name} name={name} list={listId} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} required={required} />
          <datalist id={listId}>{items.map((item) => <option key={item.id} value={item.label} />)}</datalist>
        </>
      ) : (
        <select id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} required={required}>
          <option value="">{placeholder}</option>
          {defaultValue && !items.some((item) => item.label === defaultValue) && <option value={defaultValue}>{defaultValue}</option>}
          {items.map((item) => <option key={item.id} value={item.label}>{item.label}</option>)}
        </select>
      )}
    </div>
  );
}
