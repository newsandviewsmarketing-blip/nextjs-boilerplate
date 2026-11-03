import type { ReactNode } from "react";

export function plainCompanyDescription(text: string) {
  return text.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g,"$1")
    .replace(/(^|\n)#{1,3}\s+/g,"$1")
    .replace(/\*\*|\*|^[-*]\s+/gm,"")
    .replace(/\s+/g," ").trim();
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/g)
    .map((part,index) => {
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2,-2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1,-1)}</em>;
      const m = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      if (m) {
        try {
          const url = new URL(m[2]);
          if (url.protocol === "http:" || url.protocol === "https:") {
            return <a key={index} href={url.toString()} target="_blank" rel="noopener noreferrer">{m[1]}</a>;
          }
        } catch { /* a malformed link is plain text, never an HTML injection */ }
      }
      return <span key={index}>{part}</span>;
    });
}

export default function CompanyStory({text,tone="navy"}:{text:string;tone?:string}) {
  if (!text.trim()) return null;
  const lines = text.split(/\r?\n/).slice(0,180);
  return <div className={"vc-company-story vc-company-tone-" + (["navy","orange","slate"].includes(tone) ? tone : "navy")}>
    {lines.map((line,index) => {
      const value = line.trim();
      if (!value) return <div key={index} className="vc-story-spacer" aria-hidden="true"/>;
      if (value.startsWith("### ")) return <h4 key={index}>{inline(value.slice(4))}</h4>;
      if (value.startsWith("## ")) return <h3 key={index}>{inline(value.slice(3))}</h3>;
      if (value.startsWith("# ")) return <h2 key={index}>{inline(value.slice(2))}</h2>;
      if (/^[-*] /.test(value)) return <ul key={index}><li>{inline(value.slice(2))}</li></ul>;
      return <p key={index}>{inline(value)}</p>;
    })}
  </div>;
}
