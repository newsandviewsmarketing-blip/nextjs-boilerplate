"use client";

export default function CompanyPrintButton() {
  return <button className="button button-primary" type="button" onClick={()=>window.print()}>
    Print / Save as PDF
  </button>;
}
