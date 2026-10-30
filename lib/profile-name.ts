// Names are identity fields, not advertising surfaces. Keep punctuation and Urdu names legal.
const embeddedLink = /(?:https?:\/\/|www\.|t\.me\/|telegra\.ph\/|\b[a-z0-9-]+\.(?:com|net|org|pk|xyz|top|site|info)\b)/i;
const promotionalText = /\b(?:promo\s*code|promocode|learn\s+more\s+here|click\s+here|free\s+money)\b/i;

export function profileNameProblem(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 120) return "Name must contain 2 to 120 characters.";
  if (/[\u0000-\u001F\u007F<>]/.test(trimmed)) return "Remove control or markup characters from the name.";
  if (embeddedLink.test(trimmed) || promotionalText.test(trimmed)) return "Names cannot contain website links or promotional messages.";
  return null;
}

export function isSuspiciousProfileName(name: string): boolean {
  return Boolean(embeddedLink.test(name) || promotionalText.test(name));
}
