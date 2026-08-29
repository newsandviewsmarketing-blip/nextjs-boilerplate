export function PublicContactLinks({
  phone,
  email,
  website,
  mapUrl,
}: {
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  mapUrl?: string | null;
}) {
  const safeWebsite = website && /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : null;
  const safeMap = mapUrl && /^https?:\/\//i.test(mapUrl) ? mapUrl : null;
  return (
    <div className="public-contact-links">
      {phone && <a href={`tel:${phone.replace(/\s+/g, "")}`}>Call</a>}
      {email && <a href={`mailto:${email}`}>Email</a>}
      {safeWebsite && <a href={safeWebsite} target="_blank" rel="noreferrer">Website</a>}
      {safeMap && <a href={safeMap} target="_blank" rel="noreferrer">Google Maps</a>}
    </div>
  );
}
