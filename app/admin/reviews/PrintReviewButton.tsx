"use client";

type Props = { targetId: string };

export default function PrintReviewButton({ targetId }: Props) {
  const printReview = () => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const style = document.createElement("style");
    style.textContent = `@media print {
      body * { visibility: hidden !important; }
      .vc-print-target, .vc-print-target * { visibility: visible !important; }
      .vc-print-target { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 12mm !important; box-shadow: none !important; border: 0 !important; }
      .vc-print-target details { display: block !important; }
      .vc-print-target details > * { display: block !important; }
      .vc-print-target form, .vc-print-target button, .vc-print-target .vc-print-control { display: none !important; }
    }`;
    target.classList.add("vc-print-target");
    document.head.appendChild(style);
    const clean = () => {
      target.classList.remove("vc-print-target");
      style.remove();
      window.removeEventListener("afterprint", clean);
    };
    window.addEventListener("afterprint", clean, {once:true});
    window.print();
  };

  return <button type="button" className="button button-secondary vc-print-control" onClick={printReview}>
    Print / Save PDF
  </button>;
}
