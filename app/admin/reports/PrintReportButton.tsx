"use client";
export default function PrintReportButton(){
  return <button type="button" className="button button-secondary" onClick={()=>window.print()}>Print / Save PDF</button>;
}
