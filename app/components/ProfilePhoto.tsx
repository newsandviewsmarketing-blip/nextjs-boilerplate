/* eslint-disable @next/next/no-img-element -- Approved database image URLs must be displayed directly without a host rewrite or image transformation. */

export default function ProfilePhoto({
  imageUrl,
  name,
  fallback,
}: {
  imageUrl: string | null;
  name: string;
  fallback: string;
}) {
  return imageUrl ? (
    <img
      className="profile-photo"
      src={imageUrl}
      alt={`${name} profile photograph`}
      loading="lazy"
      decoding="async"
    />
  ) : fallback;
}
