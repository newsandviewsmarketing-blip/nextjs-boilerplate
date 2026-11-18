import Image from "next/image";
import Link from "next/link";

/**
 * Public job artwork is always served by the approved-only advertisement route.
 * The original upload is never cropped or converted. A uniform 4:5 viewport
 * gives mixed-size employer artwork a consistent presentation without distortion.
 */
export default function JobPosterThumbnail({
  id,
  slug,
  title,
  company,
  available,
  priority = false,
  compact = false,
}: {
  id: string | null;
  slug: string;
  title: string;
  company: string;
  available: boolean;
  priority?: boolean;
  compact?: boolean;
}) {
  const showImage = Boolean(available && id);
  return (
    <Link
      href={`/jobs/${slug}`}
      className={`job-poster-thumbnail${compact ? " job-poster-thumbnail--compact" : ""}`}
      aria-label={`View ${title} at ${company}`}
    >
      {showImage ? (
        <Image
          src={`/api/jobs/${id}/advertisement`}
          alt={`Original recruitment advertisement: ${title} at ${company}`}
          unoptimized
          fill
          sizes={compact ? "(max-width: 640px) 100px, 145px" : "(max-width: 640px) 88px, 116px"}
          priority={priority}
          className="job-poster-thumbnail__image"
        />
      ) : (
        <span className="job-poster-thumbnail__fallback" aria-hidden="true">
          <span className="job-poster-thumbnail__mark">VC</span>
          <span>JOB OPENING</span>
        </span>
      )}
    </Link>
  );
}
